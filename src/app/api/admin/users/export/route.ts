import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { memberStatuses, type MemberStatus } from "@/data/memberStatus";
import { adminRoleLabels, type AdminRole } from "@/data/adminRole";
import {
  memberClassificationLabels,
  getMemberClassification,
} from "@/data/memberType";
import { formatDate } from "@/lib/dates";

/** 값에 쉼표·따옴표·줄바꿈이 있으면 CSV 규칙대로 큰따옴표로 감싼다. */
function csvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");

  const where: Prisma.UserWhereInput = {};
  if (status && memberStatuses.includes(status as MemberStatus)) {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }
  if (type === "ADMIN") where.adminRole = { not: null };
  else if (type === "PARTNER") {
    where.adminRole = null;
    where.memberType = "PARTNER";
  } else if (type === "CUSTOMER") {
    where.adminRole = null;
    where.memberType = "CUSTOMER";
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      adminRole: true,
      memberType: true,
      createdAt: true,
      lastLoginAt: true,
      partner: { select: { name: true } },
      _count: { select: { projects: true } },
    },
  });

  const header = [
    "회원번호",
    "이름",
    "이메일",
    "휴대폰",
    "상태",
    "회원 구분",
    "관리자 등급",
    "연결 업체",
    "프로젝트",
    "가입일",
    "최근 로그인",
  ];
  const rows = users.map((user) => {
    const classification = getMemberClassification(user);
    return [
      user.id,
      user.name,
      user.email,
      user.phone ?? "",
      user.status,
      memberClassificationLabels[classification],
      user.adminRole ? adminRoleLabels[user.adminRole as AdminRole] : "",
      user.partner?.name ?? "",
      String(user._count.projects),
      formatDate(user.createdAt),
      user.lastLoginAt ? formatDate(user.lastLoginAt) : "",
    ]
      .map((cell) => csvCell(cell))
      .join(",");
  });

  // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 앞에 붙인다.
  const csv = "﻿" + [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="onnest-members.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
