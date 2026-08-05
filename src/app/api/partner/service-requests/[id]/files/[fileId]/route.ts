import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { isPartnerStaff } from "@/lib/partnerAuth";
import { deleteProjectFile, readProjectFile } from "@/lib/storage";

/**
 * 배정된 업체 직원 또는 관리자만 조회할 수 있다. 고객(프로젝트 소유자)
 * 노출은 이번 범위 밖이다(다음 단계인 '고객 내 문의'에서 다룬다).
 */
async function findAccessibleFile(
  fileId: string,
  serviceRequestId: string,
  user: { id: string; adminRole: string | null; memberType: string; partnerId: string | null },
) {
  const document = await prisma.document.findFirst({
    where: { id: fileId, serviceRequestId },
    include: { serviceRequest: { select: { partnerId: true } } },
  });
  if (!document) return null;

  const allowed =
    isSuperAdmin(user) ||
    (isPartnerStaff(user) && document.serviceRequest?.partnerId === user.partnerId);
  return allowed ? document : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id, fileId } = await params;
  const document = await findAccessibleFile(fileId, id, user);
  if (!document) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
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
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !isPartnerStaff(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id, fileId } = await params;
  const document = await prisma.document.findFirst({
    where: { id: fileId, serviceRequestId: id, uploadedByRole: "PARTNER" },
    include: { serviceRequest: { select: { partnerId: true } } },
  });
  if (!document || document.serviceRequest?.partnerId !== user.partnerId) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  await deleteProjectFile(document.storageKey);
  await prisma.document.delete({ where: { id: document.id } });

  return NextResponse.json({ id: document.id });
}
