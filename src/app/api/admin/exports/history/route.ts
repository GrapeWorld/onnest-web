import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";

/** 내보내기 감사 이력 조회. 최고관리자만 볼 수 있다 — 조회전용 관리자도 접근 불가. */
export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const history = await prisma.adminDataExportHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      actorName: true,
      actorEmail: true,
      exportType: true,
      customerId: true,
      projectId: true,
      dateFrom: true,
      dateTo: true,
      rowCount: true,
      status: true,
      reason: true,
      createdAt: true,
    },
  });

  return NextResponse.json(history, { headers: { "Cache-Control": "private, no-store" } });
}
