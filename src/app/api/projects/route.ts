import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { projectSchema } from "@/lib/projectSchema";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { name, spaceType, address, moveInDate, budget } = parsed.data;

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name,
      spaceType,
      address: address || null,
      moveInDate: moveInDate ? new Date(moveInDate) : null,
      budget: budget || null,
    },
  });

  return NextResponse.json({ id: project.id }, { status: 201 });
}
