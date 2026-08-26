import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { CandidatePropertyForm, emptyCandidatePropertyValues, type CandidatePropertyFormValues } from "@/components/app/CandidatePropertyForm";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerPropertySuggestion } from "@/lib/propertySuggestions";
import type { CandidatePropertyTransactionType } from "@/data/candidateProperty";

export default async function NewCandidatePropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ fromSuggestion?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { fromSuggestion } = await searchParams;

  let initialValues: CandidatePropertyFormValues = emptyCandidatePropertyValues;
  let suggestionId: string | undefined;
  let description = "외부 사이트에서 확인한 매물 정보를 직접 입력해 저장합니다.";

  if (fromSuggestion) {
    const suggestion = await getCustomerPropertySuggestion(fromSuggestion, user.id);
    if (suggestion && !suggestion.savedCandidatePropertyId) {
      suggestionId = suggestion.id;
      description = "공유받은 매물 정보를 확인하고, 필요하면 수정한 뒤 저장해주세요.";
      initialValues = {
        sourceUrl: suggestion.sourceUrl,
        title: suggestion.title,
        address: suggestion.address ?? "",
        transactionType: (suggestion.transactionType as CandidatePropertyTransactionType | null) ?? "",
        price: suggestion.price?.toString() ?? "",
        deposit: suggestion.deposit?.toString() ?? "",
        monthlyRent: suggestion.monthlyRent?.toString() ?? "",
        area: suggestion.area?.toString() ?? "",
        roomCount: suggestion.roomCount?.toString() ?? "",
        availableDate: suggestion.availableDate ? suggestion.availableDate.toISOString().slice(0, 10) : "",
        memo: "",
        advantages: suggestion.sharedReason ?? "",
        concerns: suggestion.cautionNote ?? "",
        status: "관심",
      };
    }
  }

  return (
    <AppShell title="매물 후보 추가" description={description}>
      <CandidatePropertyForm mode="create" initialValues={initialValues} suggestionId={suggestionId} />
    </AppShell>
  );
}
