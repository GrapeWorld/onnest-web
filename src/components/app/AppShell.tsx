import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

// 매물 검색은 MVP 범위 밖이라 내비게이션에서 임시로 뺐다.
// 기능을 다시 열 때 ["검색", "/search"] 항목을 맨 앞에 되살리면 된다.
const appNav = [
  ["새 프로젝트", "/projects/new"],
  ["내 정보", "/my"],
];

export function AppShell({
  title,
  description,
  showNav = true,
  contentClassName,
  children,
}: {
  title: string;
  description: string;
  /** 로그인·회원가입처럼 앱 내비게이션이 필요 없는 화면에서는 끈다. */
  showNav?: boolean;
  /**
   * 콘텐츠 영역(내비·제목·본문 전체)의 너비를 좁히고 싶을 때 쓴다.
   * 폼처럼 좁은 화면은 `max-w-3xl`을 넘겨 제목과 본문의 좌우 기준선을 맞춘다.
   * tailwind-merge가 기본 max-w-7xl을 덮어쓴다.
   */
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-cream/60 px-5 py-8 md:py-12">
      <div className={cn("mx-auto w-full max-w-7xl", contentClassName)}>
        {showNav && (
          <nav className="mb-8 flex flex-wrap gap-2 text-sm font-semibold">
            {appNav.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full bg-white px-4 py-2 text-forest shadow-card hover:bg-mint"
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
        <section className="mb-8">
          <h1 className="text-3xl font-black text-forest md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-ink/70">
            {description}
          </p>
        </section>
        {children}
      </div>
    </main>
  );
}

export function MetricGrid({ items }: { items: string[][] }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map(([label, value]) => (
        <Card key={label} className="p-5">
          <p className="text-sm text-ink/55">{label}</p>
          <p className="mt-2 text-2xl font-black text-forest">{value}</p>
        </Card>
      ))}
    </div>
  );
}

export function ChecklistPanel({ items }: { items: string[][] }) {
  return (
    <Card>
      <h2 className="text-xl font-bold text-forest">체크리스트</h2>
      <div className="mt-5 space-y-3">
        {items.map(([label, status]) => (
          <div key={label} className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3 text-sm">
            <span className="font-semibold text-forest">{label}</span>
            <span className="text-ink/60">{status}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
