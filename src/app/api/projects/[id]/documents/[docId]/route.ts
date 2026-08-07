import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { deleteProjectFile, readProjectFile } from "@/lib/storage";

/**
 * 소유자만 조회할 수 있는 문서를 찾는다. 일반 프로젝트 문서함 파일
 * (uploadedByRole: "CUSTOMER", 고객 본인이 올린 것)만 대상이다 — 파트너가
 * 서비스 신청에 올린 내부 파일(견적서·계약서·현장사진)은 여기서 제외해야
 * 한다. 안 그러면 프로젝트 소유자라는 이유만으로 파트너 내부 파일을
 * 조회·삭제할 수 있게 된다.
 */
function findOwnedDocument(docId: string, projectId: string, userId: string) {
  return prisma.document.findFirst({
    where: { id: docId, projectId, project: { userId }, uploadedByRole: "CUSTOMER" },
  });
}

/**
 * 문서 내려받기.
 * 스토리지 URL은 알면 누구나 열 수 있으므로 클라이언트에 넘기지 않고,
 * 소유권을 확인한 뒤 서버가 대신 받아서 흘려보낸다.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { id, docId } = await params;
  const document = await findOwnedDocument(docId, id, user.id);
  if (!document) {
    return NextResponse.json(
      { error: "문서를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const stream = await readProjectFile(document.storageKey);
  if (!stream) {
    return NextResponse.json(
      { error: "파일을 가져오지 못했습니다." },
      { status: 502 },
    );
  }

  return new NextResponse(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": document.mimeType,
      // 파일명에 한글이 들어가므로 filename* 로 인코딩해서 넘긴다.
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { id, docId } = await params;
  const document = await findOwnedDocument(docId, id, user.id);
  if (!document) {
    return NextResponse.json(
      { error: "문서를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  // 스토리지에서 먼저 지우고 DB 기록을 정리한다.
  // 스토리지 삭제가 실패해도 사용자가 다시 시도할 수 있도록 DB 행은 남긴다.
  await deleteProjectFile(document.storageKey);
  await prisma.document.delete({ where: { id: document.id } });

  return NextResponse.json({ id: document.id });
}
