import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerPropertySuggestion } from "@/lib/propertySuggestions";

/**
 * 공유 매물 단건 조회. "내 매물 후보에 저장" 화면에서 기존 매물 등록 폼을
 * 미리 채우는 용도로만 쓴다 — 소유권은 project.userId로 검증하고, 관리자
 * 전용 필드(adminMemo·sharedBy*)는 절대 포함하지 않는다.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const suggestion = await getCustomerPropertySuggestion(id, user.id);
  if (!suggestion) {
    return NextResponse.json({ error: "공유된 매물을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(suggestion);
}
