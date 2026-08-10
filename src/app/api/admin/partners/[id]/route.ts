import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { updatePartnerSchema } from "@/lib/partnerSchema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updatePartnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const existing = await prisma.partner.findUnique({
    where: { id },
    select: {
      id: true,
      serviceType: true,
      _count: { select: { requests: true } },
    },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "업체를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  // 배정 기록이 있는 업체의 서비스 유형을 바꾸면 이미 배정된 신청과 유형이
  // 어긋난다 — 배정 이력이 없을 때만 유형 변경을 허용한다.
  if (
    parsed.data.serviceType &&
    parsed.data.serviceType !== existing.serviceType &&
    existing._count.requests > 0
  ) {
    return NextResponse.json(
      { error: "배정된 신청이 있는 업체는 서비스 유형을 변경할 수 없습니다." },
      { status: 400 },
    );
  }

  const {
    contactName,
    contactPhone,
    adminMemo,
    businessRegistrationNumber,
    bankName,
    bankAccountHolder,
    bankAccountNumber,
    ...rest
  } = parsed.data;
  const partner = await prisma.partner.update({
    where: { id },
    data: {
      ...rest,
      ...(contactName !== undefined && { contactName: contactName || null }),
      ...(contactPhone !== undefined && { contactPhone: contactPhone || null }),
      ...(adminMemo !== undefined && { adminMemo: adminMemo || null }),
      ...(businessRegistrationNumber !== undefined && {
        businessRegistrationNumber: businessRegistrationNumber || null,
      }),
      ...(bankName !== undefined && { bankName: bankName || null }),
      ...(bankAccountHolder !== undefined && {
        bankAccountHolder: bankAccountHolder || null,
      }),
      ...(bankAccountNumber !== undefined && {
        bankAccountNumber: bankAccountNumber || null,
      }),
    },
  });

  return NextResponse.json({ partner });
}
