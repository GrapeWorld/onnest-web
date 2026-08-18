import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[24px] border border-forest/10 bg-white p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-soft", className)}>
      {children}
    </div>
  );
}

/**
 * 같은 행의 카드끼리 높이를 맞추려면 이 컴포넌트 자체가 grid의 직계
 * 자식이어야 한다(grid의 stretch는 직계 자식만 늘린다) — 호출부에서 별도
 * wrapper div로 감싸지 않는다. h-full로 grid가 늘려준 셀 높이를 그대로
 * 채우고, 내부는 세로 flex라 "자세히 보기" 링크가 있을 때만 mt-auto로
 * 카드 하단에 붙는다(없으면 그 자리만 비워둔다 — 카드마다 링크 유무가
 * 달라도 나머지 요소 정렬은 흐트러지지 않는다).
 */
export function FeatureCard({
  title,
  description,
  icon: Icon,
  href,
  linkLabel,
  className,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <Card className={cn("flex h-full min-w-0 flex-col", className)}>
      <div className="mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-forest">
        {Icon ? <Icon className="h-5 w-5" strokeWidth={2.25} /> : "✓"}
      </div>
      <h3 className="min-w-0 break-words text-lg font-bold text-forest">{title}</h3>
      <p className="mt-3 min-w-0 break-words text-sm leading-7 text-ink/70">{description}</p>
      {href && (
        <div className="mt-auto pt-4">
          <Link
            href={href}
            className="inline-flex text-sm font-semibold text-forest hover:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80"
          >
            {linkLabel ?? "자세히 보기"} →
          </Link>
        </div>
      )}
    </Card>
  );
}

export function PrincipleCard({
  category,
  does,
  doesNot,
}: {
  category: string;
  does: string;
  doesNot: string;
}) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-wide text-sage">{category}</p>
      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-mint px-4 py-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest text-[11px] font-bold text-white">
          O
        </span>
        <p className="text-sm font-semibold leading-6 text-forest">{does}</p>
      </div>
      <div className="mt-3 flex items-start gap-3 rounded-2xl bg-cream px-4 py-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/25 text-[11px] font-bold text-white">
          X
        </span>
        <p className="text-sm leading-6 text-ink/65">{doesNot}</p>
      </div>
    </Card>
  );
}
