import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isPartnerStaff, getServiceRequestWritePermission } from "@/lib/partnerAuth";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";

const noteSchema = z.object({
  body: z.string().trim().min(1, "메모 내용을 입력해주세요.").max(2000),
});

/**
 * 업체 포털 — 배정된 요청에 남기는 내부 메모. 고객·관리자에게는 노출되지
 * 않는다. NOTE_ADDED 활동으로만 저장하며 수정·삭제 API는 만들지 않는다.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !isPartnerStaff(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const limit = await checkRateLimit("partnerRequestNote", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.` },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const existing = await prisma.serviceRequest.findUnique({
    where: { id },
    select: { id: true, partnerId: true, partnerStaffId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
  }
  const permission = await getServiceRequestWritePermission(user, existing);
  if (!permission.ok) {
    return NextResponse.json(
      { error: permission.reason === "forbidden" ? "권한이 없습니다." : "요청을 찾을 수 없습니다." },
      { status: permission.reason === "forbidden" ? 403 : 404 },
    );
  }

  const activity = await prisma.serviceRequestActivity.create({
    data: {
      serviceRequestId: id,
      action: "NOTE_ADDED",
      note: parsed.data.body,
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.name,
      actorRole: "PARTNER",
      partnerId: user.partnerId,
    },
  });

  return NextResponse.json({ activity }, { status: 201 });
}
