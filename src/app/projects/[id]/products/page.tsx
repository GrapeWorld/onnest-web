import { productSuggestions } from "@/data/appMock";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";

export default function ProjectProductsPage() {
  return (
    <AppShell title="렌탈·생활제품 추천" description="특정 상품 강매가 아니라 집 상태, 예산, 거주 형태, 인수인계 정보를 바탕으로 선택지를 정리합니다.">
      <div className="grid gap-5 md:grid-cols-3">{productSuggestions.map((item) => <Card key={item}>{item}</Card>)}</div>
    </AppShell>
  );
}
