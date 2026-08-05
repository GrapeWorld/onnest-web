import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  deleteProjectFile,
  isStorageConfigured,
  putProjectFile,
} from "@/lib/storage";
import { validateUpload, validateUploadContents } from "@/lib/documents";

/** 문서 업로드. multipart/form-data의 file 필드를 받는다. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  // 소유권을 먼저 본다. 남의 프로젝트에는 스토리지 설정 여부도 알려주지 않는다.
  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "올릴 파일을 선택해주세요." },
      { status: 400 },
    );
  }

  const invalid = validateUpload(file);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }
  const invalidContents = await validateUploadContents(file);
  if (invalidContents) {
    return NextResponse.json({ error: invalidContents }, { status: 400 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      {
        error: "파일 스토리지가 설정되지 않았습니다. 관리자에게 문의해주세요.",
      },
      { status: 503 },
    );
  }

  const stored = await putProjectFile(id, file);

  let document;
  try {
    document = await prisma.document.create({
      data: {
        projectId: id,
        filename: file.name.slice(0, 200),
        mimeType: file.type,
        size: file.size,
        storageKey: stored.storageKey,
      },
      // storageKey는 응답에 넣지 않는다. 내려받기는 문서 id로만 한다.
      select: { id: true, filename: true, size: true, createdAt: true },
    });
  } catch (error) {
    try {
      await deleteProjectFile(stored.storageKey);
    } catch {
      console.error(`[document-upload] orphan blob cleanup failed for project ${id}`);
    }
    throw error;
  }

  return NextResponse.json(document, { status: 201 });
}
