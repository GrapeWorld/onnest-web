import { Card } from "@/components/ui/Card";

export function HandoverView({
  summary,
  items,
}: {
  summary: string;
  items: { label: string; note: string }[];
}) {
  return (
    <div className="grid gap-5">
      <Card>
        <h2 className="text-xl font-black text-forest">생활 정보 요약</h2>
        <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-ink/75">
          {summary}
        </p>
      </Card>

      {items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item.label} className="p-5">
              <p className="text-xs font-bold text-sage">{item.label}</p>
              <p className="mt-2 text-sm leading-7 text-ink/75">{item.note}</p>
            </Card>
          ))}
        </div>
      )}

      <p className="text-sm leading-7 text-ink/55">
        인수인계서는 사람 평가가 아니라 공간과 사용 경험을 전달하는 참고
        정보입니다. 계약 판단은 공식기관 확인이 필요합니다.
      </p>
    </div>
  );
}
