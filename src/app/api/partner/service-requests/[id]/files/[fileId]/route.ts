import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import {
  isPartnerStaff,
  getServiceRequestReadAccess,
  getServiceRequestWritePermission,
} from "@/lib/partnerAuth";
import { deleteProjectFile, readProjectFile } from "@/lib/storage";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";

/**
 * 배정된 업체 직원 또는 관리자만 조회할 수 있다. 고객(프로젝트 소유자)
 * 노출은 이번 범위 밖이다(다음 단계인 '고객 내 문의'에서 다룬다).
 *
 * 업체 판정은 업로드 당시 스냅샷인 document.partnerId로 한다 — 요청이
 * 재배정된 뒤의 살아있는 serviceRequest.partnerId로만 검사하면, 재배정
 * 이후 새 업체가 이전 업체가 올린 파일을 그대로 내려받을 수 있게 된다.
 * 담당 STAFF가 아닌 직원은(VIEWER는 예외) 상세 화면에서 이 요청 자체를
 * 볼 수 없으므로, 파일 다운로드도 같은 기준으로 막는다.
 *
 * 그런데 스냅샷만으로는 반대 방향 유출이 남는다: 재배정으로 담당이
 * 바뀐 뒤에도 "이전" 업체의 OWNER/MANAGER/VIEWER는 document.partnerId가
 * 자기 회사와 같으므로 역할 검사만 통과하면 여전히 접근할 수 있었다
 * (STAFF만 partnerStaffId로 걸러졌다). 그래서 스냅샷(document.partnerId)이
 * 지금 살아있는 배정(serviceRequest.partnerId)과 다르면 — 즉 이 파일이
 * 업로드된 뒤로 한 번이라도 재배정이 있었으면 — 역할과 무관하게 아무도
 * (관리자 제외) 접근하지 못하게 막는다. 상세 화면이 이미 같은 요청을
 * 재배정 후 아무에게도 안 보여주는 것과 원칙이 같다.
 */
async function findAccessibleFile(
  fileId: string,
  serviceRequestId: string,
  user: { id: string; status: string; adminRole: string | null; memberType: string; partnerId: string | null },
) {
  const document = await prisma.document.findFirst({
    where: { id: fileId, serviceRequestId },
    include: { serviceRequest: { select: { partnerId: true, partnerStaffId: true } } },
  });
  if (!document) return null;

  if (isSuperAdmin(user)) return document;
  if (document.partnerId !== document.serviceRequest?.partnerId) return null;
  const canRead = await getServiceRequestReadAccess(user, {
    partnerId: document.partnerId,
    partnerStaffId: document.serviceRequest?.partnerStaffId ?? null,
  });
  return canRead ? document : null;
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

  const limit = await checkRateLimit("partnerRequestFile", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.` },
      { status: 429 },
    );
  }

  const { id, fileId } = await params;
  const document = await prisma.document.findFirst({
    where: { id: fileId, serviceRequestId: id, uploadedByRole: "PARTNER" },
    include: { serviceRequest: { select: { partnerId: true, partnerStaffId: true } } },
  });
  // 업로드 당시 스냅샷(partnerId) 기준 — 재배정 후 새 업체가 이전 업체의
  // 파일을 삭제하지 못하게 막는다(다운로드 차단보다 더 중요한 방어).
  // 스냅샷이 지금 살아있는 배정과 다르면(재배정된 적이 있으면) 이전
  // 업체도 더 이상 지울 수 없다 — findAccessibleFile과 같은 원칙.
  if (!document || document.partnerId !== document.serviceRequest?.partnerId) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }
  const permission = await getServiceRequestWritePermission(user, {
    partnerId: document.partnerId,
    partnerStaffId: document.serviceRequest?.partnerStaffId ?? null,
  });
  if (!permission.ok) {
    return NextResponse.json(
      { error: permission.reason === "forbidden" ? "권한이 없습니다." : "파일을 찾을 수 없습니다." },
      { status: permission.reason === "forbidden" ? 403 : 404 },
    );
  }

  await deleteProjectFile(document.storageKey);
  await prisma.document.delete({ where: { id: document.id } });

  return NextResponse.json({ id: document.id });
}
