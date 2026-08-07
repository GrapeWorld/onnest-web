import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { consumeInvitation } from "@/lib/partnerInvitation";

const reasonMessages: Record<string, string> = {
  invalid: "초대 링크가 만료되었거나 이미 사용되었습니다.",
  "email-mismatch": "이 초대는 다른 이메일로 발송되었습니다. 초대받은 이메일 계정으로 로그인해주세요.",
  "admin-conflict": "관리자 계정은 업체 직원으로 소속될 수 없습니다.",
  "already-member": "이미 다른 업체에 소속돼 있습니다.",
};

/** 로그인한 계정으로 업체 직원 초대를 수락한다. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { token } = await params;

  let result;
  try {
    result = await consumeInvitation({
      token,
      user: { id: user.id, email: user.email, adminRole: user.adminRole },
    });
  } catch {
    return NextResponse.json(
      { error: "다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요." },
      { status: 409 },
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: reasonMessages[result.reason] ?? "초대를 수락하지 못했습니다." },
      { status: 400 },
    );
  }

  return NextResponse.json({ partnerId: result.partnerId });
}
