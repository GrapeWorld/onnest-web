import { notFound, redirect } from "next/navigation";
import { CustomerAppShell } from "@/components/app/CustomerAppShell";
import { CandidatePropertyForm, type CandidatePropertyFormValues } from "@/components/app/CandidatePropertyForm";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDateInputValue } from "@/lib/dates";
import type { CandidatePropertyStatus, CandidatePropertyTransactionType } from "@/data/candidateProperty";

function numberToInput(value: number | null) {
  return value == null ? "" : String(value);
}

export default async function EditCandidatePropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { id } = await params;
  const property = await prisma.candidateProperty.findFirst({
    where: { id, userId: user.id },
  });
  if (!property) notFound();

  const initialValues: CandidatePropertyFormValues = {
    sourceUrl: property.sourceUrl,
    title: property.title,
    address: property.address ?? "",
    transactionType: (property.transactionType as CandidatePropertyTransactionType | null) ?? "",
    price: numberToInput(property.price),
    deposit: numberToInput(property.deposit),
    monthlyRent: numberToInput(property.monthlyRent),
    area: numberToInput(property.area),
    roomCount: numberToInput(property.roomCount),
    availableDate: property.availableDate ? toDateInputValue(property.availableDate) : "",
    memo: property.memo ?? "",
    advantages: property.advantages ?? "",
    concerns: property.concerns ?? "",
    status: property.status as CandidatePropertyStatus,
  };

  return (
    <CustomerAppShell title="매물 후보 수정" description="저장된 매물 후보 정보를 확인하고 수정합니다.">
      <CandidatePropertyForm mode="edit" candidateId={property.id} initialValues={initialValues} />
    </CustomerAppShell>
  );
}
