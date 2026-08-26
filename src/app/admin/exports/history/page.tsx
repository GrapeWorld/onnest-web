import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminExportSectionLabels, type AdminExportSection } from "@/data/adminExport";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

const exportTypeLabel: Record<string, string> = {
  CUSTOMER: "고객 전체",
  PROJECT: "프로젝트 1건",
  ALL_CUSTOMERS: "전체 고객",
};

export default async function AdminExportHistoryPage() {
  await requireSuperAdmin();

  const history = await prisma.adminDataExportHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <AppShell title="내보내기 이력" description="누가, 언제, 어떤 범위의 데이터를 어떤 사유로 몇 건 내보냈는지 확인합니다.">
      <Link href="/admin/exports" className="mb-6 inline-block text-sm font-semibold text-forest hover:underline">
        ← 데이터 내보내기로
      </Link>

      {history.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-ink/55">아직 내보내기 기록이 없습니다.</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-forest/10 text-left text-xs text-ink/50">
                <th className="px-4 py-3">생성 관리자</th>
                <th className="px-4 py-3">종류</th>
                <th className="px-4 py-3">기간</th>
                <th className="px-4 py-3">포함 데이터</th>
                <th className="px-4 py-3">사유</th>
                <th className="px-4 py-3">행 수</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">생성일</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id} className="border-b border-forest/5 align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-forest">{entry.actorName}</p>
                    <p className="text-xs text-ink/50">{entry.actorEmail}</p>
                  </td>
                  <td className="px-4 py-3">{exportTypeLabel[entry.exportType] ?? entry.exportType}</td>
                  <td className="px-4 py-3 text-xs text-ink/60">
                    {entry.dateFrom || entry.dateTo
                      ? `${entry.dateFrom ? dateTimeFormatter.format(entry.dateFrom) : "제한 없음"} ~ ${entry.dateTo ? dateTimeFormatter.format(entry.dateTo) : "제한 없음"}`
                      : "전체 기간"}
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-xs text-ink/60">
                    {entry.includedSections
                      .split(",")
                      .filter(Boolean)
                      .map((section) => adminExportSectionLabels[section as AdminExportSection] ?? section)
                      .join(", ")}
                  </td>
                  <td className="max-w-[200px] px-4 py-3 text-xs text-ink/60">{entry.reason}</td>
                  <td className="px-4 py-3">{entry.rowCount ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        entry.status === "SUCCESS" ? "bg-mint text-forest" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {entry.status === "SUCCESS" ? "성공" : "실패"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/50">{dateTimeFormatter.format(entry.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </AppShell>
  );
}
