import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isPartnerStaff, getServiceRequestWritePermission } from "@/lib/partnerAuth";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { contactMethods } from "@/data/inquiryActivity";
import { reasonableTimestampField } from "@/lib/dateField";

const contactSchema = z.object({
  method: z.enum(contactMethods, { error: "연락 방식을 선택해주세요." }),
  result: z.string().trim().min(1, "연락 결과를 입력해주세요.").max(500),
  contactedAt: reasonableTimestampField("연락 시각을 확인해주세요."),
  followUp: z.string().trim().max(500).optional().or(z.literal("")),
});

/** 업체 포털 — 고객과의 연락 기록. 원문 신청 내용은 건드리지 않는다. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !isPartnerStaff(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const limit = await checkRateLimit("partnerRequestContact", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.` },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
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

  const { method, result, contactedAt, followUp } = parsed.data;
  const activity = await prisma.serviceRequestActivity.create({
    data: {
      serviceRequestId: id,
      action: "CONTACT_LOGGED",
      changes: {
        method,
        result,
        contactedAt: new Date(contactedAt).toISOString(),
        followUp: followUp || null,
      },
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.name,
      actorRole: "PARTNER",
      partnerId: user.partnerId,
    },
  });

  return NextResponse.json({ activity }, { status: 201 });
}
