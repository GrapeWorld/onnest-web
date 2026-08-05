import { Resend } from "resend";

/**
 * RESEND_API_KEY가 없으면(로컬 개발 등) 실제 발송 대신 콘솔에 출력한다.
 * 문서함의 BLOB_READ_WRITE_TOKEN 미설정 처리와 같은 원칙이다.
 */
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/** 사용자 입력을 HTML 텍스트나 속성에 넣기 전에 이스케이프한다. */
export function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]!);
}

function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!local || !domain) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.warn(
      `[email] skipped (RESEND_API_KEY missing): ${maskEmail(to)} / ${subject}`,
    );
    return { sent: false as const };
  }

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? "ONNEST <no-reply@onnesthome.com>",
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`이메일 발송에 실패했습니다: ${error.message}`);
  }

  return { sent: true as const };
}

/**
 * 운영 알림(신규 문의·서비스 신청 등)을 관리자에게 보낸다.
 * ADMIN_NOTIFICATION_EMAIL이 없으면 콘솔에만 남기고 건너뛴다.
 * 알림 발송 실패가 원 작업(문의/신청 저장)을 막으면 안 되므로 에러를
 * 던지지 않고 로그만 남긴다 — 호출부에서 try/catch가 필요 없다.
 */
export async function notifyAdmin({
  subject,
  html,
}: {
  subject: string;
  html: string;
}) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to) {
    console.warn(`[email] admin notification skipped (ADMIN_NOTIFICATION_EMAIL missing): ${subject}`);
    return;
  }

  try {
    await sendEmail({ to, subject, html });
  } catch (error) {
    console.error("[email] admin notification failed", error);
  }
}

/**
 * 업체 직원에게 보내는 알림(신규 배정 등). notifyAdmin과 같은 원칙 —
 * 수신자가 없으면 콘솔에만 남기고, 발송 실패가 호출부의 저장 흐름을 막지
 * 않도록 에러를 삼킨다.
 */
export async function notifyPartnerStaff({
  to,
  subject,
  html,
}: {
  to: string[];
  subject: string;
  html: string;
}) {
  if (to.length === 0) {
    console.warn(`[email] partner notification skipped (no recipients): ${subject}`);
    return;
  }

  await Promise.all(
    to.map(async (email) => {
      try {
        await sendEmail({ to: email, subject, html });
      } catch (error) {
        console.error("[email] partner notification failed", error);
      }
    }),
  );
}

/**
 * 문의를 남긴 고객에게 보내는 알림(접수 확인·답변·상태 변경).
 * notifyAdmin과 같은 원칙 — 발송 실패가 호출부의 저장 흐름을 막지 않도록
 * 에러를 삼킨다.
 */
export async function notifyInquiryCustomer({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    await sendEmail({ to, subject, html });
  } catch (error) {
    console.error("[email] inquiry customer notification failed", error);
  }
}

/**
 * 서비스 신청 고객에게 보내는 알림(신규 견적 등록 등). notifyInquiryCustomer와
 * 같은 원칙 — 발송 실패가 호출부의 저장 흐름을 막지 않도록 에러를 삼킨다.
 */
export async function notifyServiceRequestCustomer({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    await sendEmail({ to, subject, html });
  } catch (error) {
    console.error("[email] service request customer notification failed", error);
  }
}

/**
 * 문의 담당자로 새로 배정된 관리자에게 보내는 알림. notifyInquiryCustomer와
 * 같은 원칙 — 발송 실패가 배정 저장 흐름을 막지 않도록 에러를 삼킨다.
 */
export async function notifyInquiryAssignee({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    await sendEmail({ to, subject, html });
  } catch (error) {
    console.error("[email] inquiry assignee notification failed", error);
  }
}
