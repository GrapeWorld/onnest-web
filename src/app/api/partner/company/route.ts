import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getActiveOwnerMembership } from "@/lib/partnerAuth";

const updateSchema = z.object({
  name: z.string().trim().min(1, "업체명을 입력해주세요.").max(100),
  contactName: z.string().trim().max(50).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  companyDescription: z.string().trim().max(1000).optional().or(z.literal("")),
});

/** 업체 대표 전용 — 업체명·담당자·연락처·업체 소개를 수정한다(서비스 유형은
 * 관리자만 바꾼다 — 배정 큐 분류에 영향을 주기 때문). 관리자 전용 내부
 * 메모(adminMemo)는 이 라우트가 절대 건드리지 않는다 — 별도 컬럼이라
 * 애초에 이 요청 스키마에 없다. */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  const membership = user ? await getActiveOwnerMembership(user) : null;
  if (!user || !membership) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { name, contactName, contactPhone, companyDescription } = parsed.data;
  const updated = await prisma.partner.update({
    where: { id: membership.partnerId },
    data: {
      name,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      companyDescription: companyDescription || null,
    },
    select: { id: true, name: true, contactName: true, contactPhone: true, companyDescription: true },
  });

  return NextResponse.json(updated);
}
