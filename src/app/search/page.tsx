import { buildingCards } from "@/data/appMock";
import { AppShell } from "@/components/app/AppShell";
import { BuildingCard } from "@/components/app/AppCards";
import { Card } from "@/components/ui/Card";

export default function SearchPage() {
  return (
    <AppShell title="공간 검색과 인수인계서 확인" description="매물 중개가 아니라, 집·사무실·공장 같은 관심 공간의 인수인계 정보와 사용 전 확인 항목을 탐색하는 화면입니다.">
      <Card className="mb-6">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_180px]">
          <input className="rounded-2xl border border-forest/15 px-4 py-3" placeholder="주소, 건물명, 동네, 사무실·공장명을 검색하세요" />
          <select className="rounded-2xl border border-forest/15 px-4 py-3"><option>공간 유형 전체</option><option>집</option><option>사무실</option><option>공장</option></select>
          <select className="rounded-2xl border border-forest/15 px-4 py-3"><option>사용 전 확인</option></select>
          <select className="rounded-2xl border border-forest/15 px-4 py-3"><option>인수인계서 있음</option></select>
        </div>
      </Card>
      <div className="grid gap-5 md:grid-cols-3">
        {buildingCards.map((building) => <BuildingCard key={building.id} building={building} />)}
      </div>
    </AppShell>
  );
}
