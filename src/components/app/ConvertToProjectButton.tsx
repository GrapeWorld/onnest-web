"use client";

import { useRouter } from "next/navigation";
import {
  emptyProjectWizardValues,
  PROJECT_DRAFT_STORAGE_KEY,
  SOURCE_CANDIDATE_STORAGE_KEY,
  type ProjectWizardValues,
} from "./project-wizard/shared";
import { formatWon } from "@/lib/currency";

export function ConvertToProjectButton({
  candidateId,
  title,
  address,
  availableDate,
  price,
  deposit,
}: {
  candidateId: string;
  title: string;
  address: string | null;
  availableDate: Date | null;
  price: number | null;
  deposit: number | null;
}) {
  const router = useRouter();

  function handleClick() {
    const amount = price ?? deposit;
    const draft: ProjectWizardValues = {
      ...emptyProjectWizardValues,
      name: title,
      address: address ?? "",
      addressPending: !address,
      moveInDate: availableDate ? availableDate.toISOString().slice(0, 10) : "",
      budget: amount != null ? `${formatWon(amount)}원` : "",
    };

    window.localStorage.setItem(PROJECT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    window.localStorage.setItem(SOURCE_CANDIDATE_STORAGE_KEY, candidateId);
    router.push("/projects/new");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-navy hover:shadow-glow"
    >
      이 매물로 프로젝트 만들기
    </button>
  );
}
