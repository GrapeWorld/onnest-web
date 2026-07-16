import { serviceLeads } from "@/data/appMock";
import { ServiceLeadCard } from "@/components/app/AppCards";
import { AppShell } from "@/components/app/AppShell";

export default function ProjectServicesPage() {
  return (
    <AppShell title="입주 서비스 연결" description="이사, 청소, 인터넷, 보수 등 입주 일정에 맞춰 필요한 서비스 연결 시점을 보여줍니다.">
      <div className="grid gap-5 md:grid-cols-4">{serviceLeads.map((item) => <ServiceLeadCard key={item[0]} item={item} />)}</div>
    </AppShell>
  );
}
