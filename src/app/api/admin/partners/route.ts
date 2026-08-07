import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { createPartnerSchema } from "@/lib/partnerSchema";
import { generatePartnerCode } from "@/lib/partnerCode";

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPartnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { name, serviceType, contactName, contactPhone, adminMemo } = parsed.data;
  const partner = await prisma.partner.create({
    data: {
      name,
      serviceType,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      adminMemo: adminMemo || null,
      partnerCode: generatePartnerCode(),
    },
  });

  return NextResponse.json({ partner }, { status: 201 });
}
