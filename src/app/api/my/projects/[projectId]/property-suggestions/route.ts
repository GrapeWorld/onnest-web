import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listProjectPropertySuggestions } from "@/lib/propertySuggestions";

/** 내 프로젝트에 공유된 매물 목록. 다른 고객의 프로젝트 id를 넣어도 애초에 조회되지 않는다. */
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { projectId } = await params;
  const result = await listProjectPropertySuggestions(projectId, user.id);

  return NextResponse.json(result);
}
