import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { CustomerSideNav } from "@/components/app/customer-nav/CustomerSideNav";
import { CustomerBottomNav } from "@/components/app/customer-nav/CustomerBottomNav";

// 매물 검색은 MVP 범위 밖이라 내비게이션에서 임시로 뺐다.
// 기능을 다시 열 때 ["검색", "/search"] 항목을 맨 앞에 되살리면 된다.
const appNav = [
  ["새 프로젝트", "/projects/new"],
  ["내 정보", "/my"],
];

export type CustomerNavData = {
  isPartner: boolean;
  isAdminUser: boolean;
  unreadCount: number;
  activeProjectId: string | null;
};

/**
 * 이 컴포넌트는 error.tsx("use client")를 포함해 서버·클라이언트 양쪽에서
 * 다 쓰이므로 next/headers·prisma 등 서버 전용 모듈을 직접 import하면 안
 * 된다(클라이언트 번들링이 깨진다). 고객 앱 내비게이션이 필요한 데이터는
 * 반드시 `customerNavData` prop으로 미리 조회해 넘긴다 — 실제 조회는
 * 서버 컴포넌트인 CustomerAppShell이 담당한다.
 */
export function AppShell({
  title,
  description,
  showNav = true,
  navItems,
  contentClassName,
  customerNavData = null,
  children,
}: {
  title: string;
  description: string;
  /** 로그인·회원가입처럼 앱 내비게이션이 필요 없는 화면에서는 끈다. */
  showNav?: boolean;
  /** 기본 고객용 내비(새 프로젝트/내 정보) 대신 쓸 항목. 업체 포털처럼 다른 영역에서 쓴다. customerNavData가 있으면 무시된다. */
  navItems?: [string, string][];
  /**
   * 콘텐츠 영역(내비·제목·본문 전체)의 너비를 좁히고 싶을 때 쓴다.
   * 폼처럼 좁은 화면은 `max-w-3xl`을 넘겨 제목과 본문의 좌우 기준선을 맞춘다.
   * tailwind-merge가 기본 max-w-7xl을 덮어쓴다.
   */
  contentClassName?: string;
  /** 로그인한 고객 화면에서만 CustomerAppShell을 통해 전달된다 — 직접 넘기지 않는다. */
  customerNavData?: CustomerNavData | null;
  children: React.ReactNode;
}) {
  const body = (
    <div className={cn("mx-auto w-full max-w-7xl", contentClassName)}>
      {showNav && !customerNavData && (
        <nav className="mb-8 flex flex-wrap gap-2 text-sm font-semibold">
          {(navItems ?? appNav).map(([label, href]) => (
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
  );

  if (!customerNavData) {
    return (
      <main className="min-h-screen bg-cream/60 px-5 py-8 md:py-12">
        {body}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream/60 px-5 pb-24 pt-8 md:py-12 lg:pb-12">
      <div className="mx-auto flex w-full max-w-[90rem] items-start gap-6 px-0">
        <CustomerSideNav
          unreadCount={customerNavData.unreadCount}
          isPartner={customerNavData.isPartner}
          isAdminUser={customerNavData.isAdminUser}
          activeProjectId={customerNavData.activeProjectId}
        />
        <div className="min-w-0 flex-1">{body}</div>
      </div>
      <CustomerBottomNav
        unreadCount={customerNavData.unreadCount}
        isPartner={customerNavData.isPartner}
        isAdminUser={customerNavData.isAdminUser}
        activeProjectId={customerNavData.activeProjectId}
      />
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
