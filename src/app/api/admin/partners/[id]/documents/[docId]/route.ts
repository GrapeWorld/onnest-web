import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { deleteProjectFile, readProjectFile } from "@/lib/storage";

/**
 * 업체 인증 서류 내려받기·삭제. 관리자 전용 — 파트너 포털에는 대응 라우트가
 * 없다. 스토리지 URL은 알면 누구나 열 수 있으므로 여기서도 서버가 대신
 * 받아서 흘려보낸다(프로젝트 문서 다운로드 라우트와 같은 원칙).
 */
function findDocument(docId: string, partnerId: string) {
  return prisma.partnerVerificationDocument.findFirst({
    where: { id: docId, partnerId },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id, docId } = await params;
  const document = await findDocument(docId, id);
  if (!document) {
    return NextResponse.json({ error: "서류를 찾을 수 없습니다." }, { status: 404 });
  }

  const stream = await readProjectFile(document.storageKey);
  if (!stream) {
    return NextResponse.json({ error: "파일을 가져오지 못했습니다." }, { status: 502 });
  }

  return new NextResponse(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id, docId } = await params;
  const document = await findDocument(docId, id);
  if (!document) {
    return NextResponse.json({ error: "서류를 찾을 수 없습니다." }, { status: 404 });
  }

  await deleteProjectFile(document.storageKey);
  await prisma.partnerVerificationDocument.delete({ where: { id: document.id } });

  return NextResponse.json({ id: document.id });
}
