import { inquiryMessageSenderRoleLabels, type InquiryMessageSenderRole } from "@/data/inquiryMessages";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export type InquiryMessageRow = {
  id: string;
  senderRole: string;
  body: string;
  senderName: string | null;
  createdAt: Date;
};

/** 고객·관리자 모두에게 보이는 문의 대화 쓰레드. 오래된 순으로 표시한다. */
export function InquiryMessageThread({ messages }: { messages: InquiryMessageRow[] }) {
  if (messages.length === 0) {
    return <p className="text-sm text-ink/55">아직 주고받은 메시지가 없습니다.</p>;
  }

  return (
    <ul className="grid gap-3">
      {messages.map((message) => {
        const isAdmin = message.senderRole === "ADMIN";
        return (
          <li
            key={message.id}
            className={`rounded-2xl px-4 py-3 text-sm ${
              isAdmin ? "bg-forest/5" : "bg-cream"
            }`}
          >
            <p className="font-semibold text-forest">
              {inquiryMessageSenderRoleLabels[message.senderRole as InquiryMessageSenderRole] ??
                message.senderRole}
              {!isAdmin && message.senderName && ` (${message.senderName})`}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-ink/70">{message.body}</p>
            <p className="mt-1 text-xs text-ink/45">{dateTimeFormatter.format(message.createdAt)}</p>
          </li>
        );
      })}
    </ul>
  );
}
