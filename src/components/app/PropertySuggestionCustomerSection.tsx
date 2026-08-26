import Link from "next/link";
import { PropertySuggestionCustomerCard, type CustomerPropertySuggestionItem } from "./PropertySuggestionCustomerCard";

/**
 * 관리자가 골라 공유한 매물 섹션. "추천"·"검증된"·"안전한" 같은 결과 보장
 * 표현은 쓰지 않고, ONNEST가 매물을 직접 중개하지 않는다는 점을 항상 함께
 * 안내한다.
 */
export function PropertySuggestionCustomerSection({
  items,
  newCount,
  newCandidatePropertyHref = "/my/candidate-properties/new",
}: {
  items: CustomerPropertySuggestionItem[];
  newCount: number;
  newCandidatePropertyHref?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-forest">프로젝트 맞춤 매물</h2>
          <p className="mt-1 text-sm text-ink/60">
            입주 목표와 희망 조건을 참고해 살펴볼 만한 외부 매물을 공유했습니다.
          </p>
        </div>
        {newCount > 0 && (
          <span className="shrink-0 rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">
            새로 공유된 매물 {newCount}건
          </span>
        )}
      </div>

      <p className="mt-2 rounded-2xl bg-cream px-4 py-3 text-xs text-ink/55">
        매물 정보는 외부 사이트에서 직접 확인해 주세요. ONNEST는 매물을 중개하거나 정보의 정확성·안전성을 보증하지 않습니다.
      </p>

      {items.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-forest/20 bg-transparent p-6">
          <p className="text-sm text-ink/60">
            아직 공유된 매물이 없습니다. 관심 있는 매물은 직접 저장해 비교할 수 있습니다.
          </p>
          <div className="mt-3 grid gap-2">
            <Link
              href={newCandidatePropertyHref}
              className="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40"
            >
              매물 후보 직접 추가
            </Link>
            <p className="text-xs text-ink/45">
              네이버 부동산, 직방 등 외부 사이트에서 매물을 확인한 뒤 이 화면에서 매물 후보로 저장할 수 있습니다.
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-4 grid min-w-0 gap-4">
          {items.map((item) => (
            <PropertySuggestionCustomerCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
