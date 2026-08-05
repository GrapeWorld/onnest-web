import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { consumeLinkToken } from "@/lib/inquiryLink";

const confirmSchema = z.object({
  token: z.string().trim().min(1, "유효하지 않은 링크입니다."),
});

/**
 * 문의 연결 토큰을 소비한다. 비밀번호 재설정과 달리 이미 로그인된 사용자의
 * 명시적 요청이므로, 확인도 같은 계정으로 로그인한 상태에서만 처리한다.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const result = await consumeLinkToken({ token: parsed.data.token, userId: user.id });
  if (!result.ok) {
    return NextResponse.json(
      { error: "링크가 만료되었거나 이미 사용되었습니다. 다시 요청해주세요." },
      { status: 400 },
    );
  }

  return NextResponse.json({ inquiryId: result.inquiryId });
}
