import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import {
  deleteProjectFile,
  isStorageConfigured,
  putPartnerFile,
} from "@/lib/storage";
import { validateUpload, validateUploadContents } from "@/lib/documents";
import { partnerVerificationDocumentTypes } from "@/data/partnerVerificationDocuments";

/** 업체 인증 서류(사업자등록증·통장사본) 업로드. 관리자 전용 — 파트너 포털에는 없다. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const partner = await prisma.partner.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!partner) {
    return NextResponse.json({ error: "업체를 찾을 수 없습니다." }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const type = form?.get("type");
  if (
    typeof type !== "string" ||
    !partnerVerificationDocumentTypes.includes(
      type as (typeof partnerVerificationDocumentTypes)[number],
    )
  ) {
    return NextResponse.json({ error: "서류 종류를 선택해주세요." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "올릴 파일을 선택해주세요." }, { status: 400 });
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
      { error: "파일 스토리지가 설정되지 않았습니다. 관리자에게 문의해주세요." },
      { status: 503 },
    );
  }

  const stored = await putPartnerFile(id, file);

  let document;
  try {
    document = await prisma.partnerVerificationDocument.create({
      data: {
        partnerId: id,
        type,
        filename: file.name.slice(0, 200),
        mimeType: file.type,
        size: file.size,
        storageKey: stored.storageKey,
        uploadedById: admin.id,
        uploadedByName: admin.name,
      },
      select: { id: true, type: true, filename: true, size: true, createdAt: true },
    });
  } catch (error) {
    try {
      await deleteProjectFile(stored.storageKey);
    } catch {
      console.error(`[partner-document-upload] orphan blob cleanup failed for partner ${id}`);
    }
    throw error;
  }

  return NextResponse.json(document, { status: 201 });
}
