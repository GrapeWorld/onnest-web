import { AppShell, MetricGrid } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
  });

  const adminCount = users.filter((user) => user.role === "admin").length;
  const withProjects = users.filter((user) => user._count.projects > 0).length;

  return (
    <AppShell
      title="회원 관리"
      description="가입자와 권한, 프로젝트 보유 현황을 확인합니다."
    >
      <MetricGrid
        items={[
          ["전체 회원", `${users.length}명`],
          ["관리자", `${adminCount}명`],
          ["프로젝트 보유", `${withProjects}명`],
          ["프로젝트 미보유", `${users.length - withProjects}명`],
        ]}
      />

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-black text-forest">회원 목록</h2>

        {users.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="font-semibold text-forest">가입한 회원이 없습니다.</p>
          </Card>
        ) : (
          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-forest text-white">
                  <tr>
                    <th className="p-4 font-semibold">이름</th>
                    <th className="p-4 font-semibold">이메일</th>
                    <th className="p-4 font-semibold">연락처</th>
                    <th className="p-4 font-semibold">권한</th>
                    <th className="p-4 font-semibold">프로젝트</th>
                    <th className="p-4 font-semibold">가입일</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-forest/10 last:border-0"
                    >
                      <td className="p-4 font-semibold text-forest">
                        {user.name}
                      </td>
                      <td className="break-all p-4 text-ink/65">
                        {user.email}
                      </td>
                      <td className="p-4 text-ink/65">{user.phone ?? "-"}</td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            user.role === "admin"
                              ? "bg-navy text-white"
                              : "bg-cream text-forest"
                          }`}
                        >
                          {user.role === "admin" ? "관리자" : "일반"}
                        </span>
                      </td>
                      <td className="p-4 text-ink/65">
                        {user._count.projects}건
                      </td>
                      <td className="p-4 text-ink/65">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <p className="mt-4 text-sm text-ink/55">
          관리자 권한은 화면에서 바꾸지 않고 서버에서{" "}
          <code className="rounded bg-cream px-1.5 py-0.5 text-xs">
            npm run set-admin -- 이메일
          </code>{" "}
          로만 부여합니다.
        </p>
      </section>
    </AppShell>
  );
}
