import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { HandoverView } from "@/components/app/HandoverView";
import { prisma } from "@/lib/prisma";

// 공유 링크는 검색엔진에 올라가면 안 된다.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SharedHandoverPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const handover = await prisma.handover.findFirst({
    // visibility까지 조건에 넣어 공유를 끈 뒤에는 토큰을 알아도 열리지 않게 한다.
    where: { shareToken: token, visibility: "link" },
    select: {
      summary: true,
      items: { select: { label: true, note: true } },
      project: { select: { spaceType: true } },
    },
  });
  if (!handover) notFound();

  return (
    <AppShell
      title="공유된 인수인계서"
      description={`${handover.project.spaceType} 공간의 생활 정보입니다. 작성자가 공유한 링크로 열람 중입니다.`}
      showNav={false}
    >
      <HandoverView summary={handover.summary} items={handover.items} />
    </AppShell>
  );
}
