import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin, isSuperAdmin } from "@/lib/auth";
import { adminPropertySuggestionSchema } from "@/lib/propertySuggestionSchema";
import { notifyServiceRequestCustomer, escapeHtml } from "@/lib/email";
import { createActionItem } from "@/lib/actionItems";

/** 프로젝트에 공유된 매물 전체 목록(철회 포함). 관리자는 조회전용이어도 볼 수 있다. */
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const admin = await getCurrentUser();
  if (!admin || !isAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { projectId } = await params;
  const suggestions = await prisma.projectPropertySuggestion.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(suggestions);
}

/** 관리자가 프로젝트에 새 매물을 공유한다. 같은 프로젝트에 같은 URL을 다시 공유할 수 없다(철회된 건은 제외). */
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, user: { select: { id: true, email: true, name: true } } },
  });
  if (!project) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = adminPropertySuggestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const duplicate = await prisma.projectPropertySuggestion.findFirst({
    where: { projectId, sourceUrl: data.sourceUrl, withdrawnAt: null },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "이미 이 프로젝트에 공유된 매물 URL입니다.", existingSuggestionId: duplicate.id },
      { status: 409 },
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const suggestion = await tx.projectPropertySuggestion.create({
      data: {
        projectId,
        sourceUrl: data.sourceUrl,
        title: data.title,
        address: data.address || null,
        transactionType: data.transactionType || null,
        price: data.price ?? null,
        deposit: data.deposit ?? null,
        monthlyRent: data.monthlyRent ?? null,
        area: data.area ?? null,
        roomCount: data.roomCount ?? null,
        availableDate: data.availableDate ? new Date(data.availableDate) : null,
        sharedReason: data.sharedReason || null,
        cautionNote: data.cautionNote || null,
        adminMemo: data.adminMemo || null,
        sharedById: admin.id,
        sharedByName: admin.name,
        sharedByEmail: admin.email,
      },
    });
    await createActionItem(tx, {
      assigneeUserId: project.user.id,
      type: "CUSTOMER_REVIEW_PROPERTY",
      title: "공유된 매물을 확인해주세요",
      description: `${project.name} 프로젝트에 새로운 매물이 공유되었습니다.`,
      internalPath: `/projects/${projectId}`,
      relatedEntityType: "ProjectPropertySuggestion",
      relatedEntityId: suggestion.id,
      sourceKey: `CUSTOMER_REVIEW_PROPERTY:${suggestion.id}`,
    });
    return suggestion;
  });

  // 알림 발송 실패가 공유 저장 자체를 막지 않는다 — notifyServiceRequestCustomer가
  // 이미 실패를 삼키므로 별도 try/catch 없이 그대로 호출한다.
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  await notifyServiceRequestCustomer({
    to: project.user.email,
    subject: `[ONNEST] ${project.name} 프로젝트에 새로운 매물이 공유되었습니다.`,
    html: `
      <p>${escapeHtml(project.user.name)}님, 안녕하세요.</p>
      <p><strong>${escapeHtml(project.name)}</strong> 프로젝트에 살펴보실 만한 매물이 새로 공유되었습니다.</p>
      <p>ONNEST는 매물을 중개하지 않으며, 공유된 정보는 참고용입니다. 정확한 내용은 원본 매물에서 직접 확인해주세요.</p>
      <p><a href="${appUrl}/projects/${projectId}">프로젝트에서 공유된 매물 확인하기</a></p>
    `,
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
