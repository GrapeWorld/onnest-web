import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const bodySchema = z.object({ shared: z.boolean() });

/** 공유 켜기/끄기. 켤 때마다 새 토큰을 발급해 이전 링크를 무효화한다. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { id } = await params;
  const handover = await prisma.handover.findFirst({
    where: { projectId: id, project: { userId: user.id } },
    select: { id: true },
  });
  if (!handover) {
    return NextResponse.json(
      { error: "인수인계서를 먼저 작성해주세요." },
      { status: 404 },
    );
  }

  const shared = parsed.data.shared;
  const updated = await prisma.handover.update({
    where: { id: handover.id },
    data: shared
      ? {
          visibility: "link",
          shareToken: randomBytes(24).toString("base64url"),
        }
      : { visibility: "private", shareToken: null },
    select: { visibility: true, shareToken: true },
  });

  return NextResponse.json(updated);
}
