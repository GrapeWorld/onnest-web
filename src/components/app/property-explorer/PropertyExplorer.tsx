"use client";

import { useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CandidatePropertyCard, priceSummary } from "@/components/app/CandidatePropertyCard";
import { PropertySuggestionCustomerCard } from "@/components/app/PropertySuggestionCustomerCard";
import { StaticPropertyMap } from "@/components/app/StaticPropertyMap";
import { InteractivePropertyMap } from "./InteractivePropertyMap";
import type { NaverMapsSdkStatus } from "./NaverMapLoader";
import {
  applyExplorerQuery,
  defaultExplorerFilters,
  explorerSourceFilterLabels,
  explorerSourceFilterValues,
  isExplorerFiltersDefault,
  mergeExplorerQueryIntoParams,
  normalizedExplorerStatusLabels,
  normalizedExplorerStatuses,
  parseExplorerQueryFromParams,
  toMapMarkers,
  UNSPECIFIED_TRANSACTION_FILTER,
  type ExplorerFilters,
  type PropertyExplorerItem,
} from "@/lib/propertyExplorer";
import { candidatePropertyTransactionTypes } from "@/data/candidateProperty";
import type { MatchablePreference } from "@/lib/propertyMatch";
import { cn } from "@/lib/cn";

type PreferenceInput =
  | {
      desiredRegion: string | null;
      transactionType: string | null;
      minBudget: number | null;
      maxBudget: number | null;
      minArea: number | null;
      minRooms: number | null;
      desiredMoveInDateISO: string | null;
    }
  | null;

function sourceBadge(item: PropertyExplorerItem): { label: string; className: string } {
  if (item.displayStage === "SUGGESTED") {
    return { label: `관리자 공유 · ${item.projectName}`, className: "bg-mint text-forest" };
  }
  if (item.origin === "ADMIN_SHARED") {
    return { label: `관리자 공유에서 저장함 · ${item.projectName}`, className: "bg-mint/60 text-forest" };
  }
  return { label: "내가 저장함", className: "bg-sage/20 text-forest" };
}

/** Tailwind의 lg 브레이크포인트(1024px)와 맞춘다 — 이 값 이상에서만 지도를 즉시 활성화한다. */
const DESKTOP_BREAKPOINT_PX = 1024;
const DESKTOP_MEDIA_QUERY = `(min-width: ${DESKTOP_BREAKPOINT_PX}px)`;

function subscribeToDesktopViewport(callback: () => void) {
  const query = window.matchMedia(DESKTOP_MEDIA_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getIsDesktopViewportSnapshot() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function getIsDesktopViewportServerSnapshot() {
  // 서버에는 뷰포트가 없다 — 모바일 우선으로 가정해도 안전하다(모바일
  // 첫 화면 로직은 좌표 유무만으로 이미 별도로 결정되고, 이 값은 지도
  // SDK를 지연 로딩할지 여부에만 쓰인다).
  return false;
}

/** matchMedia 구독은 브라우저 API라 useSyncExternalStore로 안전하게 연결한다(useEffect+setState 조합 대신). */
function useIsDesktopViewport(): boolean {
  return useSyncExternalStore(
    subscribeToDesktopViewport,
    getIsDesktopViewportSnapshot,
    getIsDesktopViewportServerSnapshot,
  );
}

/**
 * 고객이 직접 저장한 매물과 관리자가 공유한 매물을 한 화면에서 목록+지도로
 * 탐색한다. 1024px 이상에서는 목록(약 35~40%)·지도(약 60~65%)를 나란히
 * 처음부터 함께 보여주고, 그 아래에서는 버튼으로 전환한다(좌표가 하나라도
 * 있으면 첫 진입도 지도 우선).
 *
 * 인터랙티브 지도(공식 네이버 지도 Dynamic Map JS SDK)는 검색·필터 결과 중
 * 좌표가 있는 매물만 마커로 그린다. SDK가 미설정이거나 로딩에 실패하면
 * 선택된 매물 하나만 기존 정지 이미지 지도(StaticPropertyMap, SAVED 항목만
 * 가능)나 주소 텍스트로 대체한다 — 지도 실패가 매물 목록 자체를 막지 않는다.
 *
 * 검색·필터는 서버에 다시 요청하지 않고 이미 내려받은 `items` 안에서만
 * 계산한다(목록이 늘어나면 이 화면 앞단에 페이지네이션·서버 검색을 붙일
 * 필요가 있다 — 지금은 그 정도 규모가 아니라서 다루지 않는다).
 */
export function PropertyExplorer({
  items,
  preference,
  mapConfigured,
  header,
}: {
  items: PropertyExplorerItem[];
  preference: PreferenceInput;
  mapConfigured: boolean;
  /**
   * 제목·건수 배지·"매물 후보 추가"/"비교하기" 링크 등 이 화면 상단
   * 문맥. 데스크톱·모바일 목록 모드에서는 항상 보이지만, 모바일 지도
   * 모드에서는 "화면 제목 또는 최소한의 문맥"만 남기기 위해 감춘다 —
   * 토글 버튼 자체가 이미 "목록/지도"라는 문맥을 전달하고, 844×390 같은
   * 짧은 가로 화면에서 이 블록까지 남아 있으면 지도가 뷰포트 안에 전혀
   * 들어오지 않는다(사이트 공통 헤더 높이가 이미 고정 비용이라 더 줄일
   * 곳이 없다). 목록 모드로 돌아가면 다시 보인다 — 내용을 지운 게 아니라
   * 잠깐 접은 것뿐이다.
   */
  header?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const initialQuery = useMemo(() => parseExplorerQueryFromParams(searchParams), []); // eslint-disable-line react-hooks/exhaustive-deps -- URL은 최초 진입 시 한 번만 읽고, 이후로는 화면 상태가 기준이다.

  const [selectedKey, setSelectedKey] = useState<string | null>(items[0]?.key ?? null);
  // 좌표가 하나라도 있으면 모바일·태블릿에서도 첫 진입부터 지도를 우선
  // 보여준다 — 단, 전체 매물이 아니라 "최초 URL 검색·필터를 적용한 뒤
  // 실제로 화면에 보일 결과" 기준이다. 예를 들어 좌표 있는 매물이 전체
  // 목록에는 있어도 ?transaction=전세로 직접 들어와 그 매물이 필터로
  // 걸러진다면, 처음 보이는 목록엔 좌표가 없으므로 목록을 먼저 보여줘야
  // 한다. 이후로는 사용자가 직접 목록/지도를 눌러 바꾼 값만 따른다 —
  // 검색·필터 변경 등으로 이 값을 다시 강제로 바꾸지 않는다.
  const [mobileView, setMobileView] = useState<"list" | "map">(() => {
    const initialVisibleItems = applyExplorerQuery(items, initialQuery);
    return initialVisibleItems.some((item) => item.hasCoordinates) ? "map" : "list";
  });
  const userToggledViewRef = useRef(false);
  const [search, setSearch] = useState(initialQuery.search);
  const [filters, setFilters] = useState<ExplorerFilters>(initialQuery.filters);

  const isDesktop = useIsDesktopViewport();

  const visibleItems = useMemo(() => applyExplorerQuery(items, { search, filters }), [items, search, filters]);
  const markers = useMemo(() => toMapMarkers(visibleItems), [visibleItems]);

  function updateQueryInUrl(nextSearch: string, nextFilters: ExplorerFilters) {
    if (typeof window === "undefined") return;
    // Next.js 라우터 대신 History API를 직접 쓴다 — 이 화면의 검색·필터는
    // 이미 내려받은 목록 안에서만 계산하므로, 키 입력마다 서버 컴포넌트를
    // 다시 실행(App Router의 router.replace가 하는 일)할 이유가 없다.
    // 이 화면이 모르는 다른 쿼리 파라미터가 이미 URL에 있다면 지우지 않고
    // q/source/transaction/status 네 키만 갱신한다.
    const currentParams = new URLSearchParams(window.location.search);
    const merged = mergeExplorerQueryIntoParams(currentParams, { search: nextSearch, filters: nextFilters });
    const query = merged.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    updateQueryInUrl(value, filters);
  }

  function handleFilterChange(next: ExplorerFilters) {
    setFilters(next);
    updateQueryInUrl(search, next);
  }

  function handleReset() {
    setSearch("");
    setFilters(defaultExplorerFilters);
    updateQueryInUrl("", defaultExplorerFilters);
  }

  function handleSelectView(view: "list" | "map") {
    userToggledViewRef.current = true;
    setMobileView(view);
  }

  // 지도 제공 캡션은 인터랙티브 지도가 실제로 렌더링된(status==="ready")
  // 상태에서만 보여준다 — "idle"(로딩 시도조차 안 함, 예: 좌표 0건)·
  // "loading"·"unconfigured"·"error"는 전부 fallback이 대신 보이는
  // 상태라 캡션도 같이 숨겨야, 실제로는 지도를 못 보여주면서 지도가
  // 제공되는 것처럼 보이는 일이 없다.
  const [mapSdkStatus, setMapSdkStatus] = useState<NaverMapsSdkStatus>("idle");

  /**
   * 지도가 실제로 쓸 수 없는 상태(미설정·로딩 실패)로 확정되면, 사용자가
   * 아직 직접 목록/지도를 눌러본 적이 없는 한(=이 값이 좌표 유무만 보고
   * 자동으로 정해진 초기값인 한) 모바일 첫 화면을 목록으로 되돌린다(item
   * 5: "좌표가 없거나 SDK가 실패하면 목록을 먼저 표시"). 사용자가 이미
   * 직접 "지도 보기"를 눌렀다면 그 선택은 존중하고 되돌리지 않는다 — 이
   * 조건 자체가 "임의로 다시 지도 화면으로 강제 전환하지 않는다"와 반대
   * 방향(지도→목록)의 1회성 보정이라 상충하지 않는다.
   */
  function handleMapStatusChange(status: NaverMapsSdkStatus) {
    setMapSdkStatus(status);
    if (
      (status === "unconfigured" || status === "error") &&
      !userToggledViewRef.current &&
      mobileView === "map"
    ) {
      setMobileView("list");
    }
  }

  const matchablePreference: MatchablePreference = preference
    ? {
        desiredRegion: preference.desiredRegion,
        transactionType: preference.transactionType,
        minBudget: preference.minBudget,
        maxBudget: preference.maxBudget,
        minArea: preference.minArea,
        minRooms: preference.minRooms,
        desiredMoveInDate: preference.desiredMoveInDateISO ? new Date(preference.desiredMoveInDateISO) : null,
      }
    : null;

  // 검색·필터로 선택돼 있던 항목이 화면에서 사라지면 첫 번째 표시 항목을
  // 대신 선택한다. 이펙트로 selectedKey를 다시 쓰지 않고 매 렌더링에서
  // 파생값으로만 계산한다 — 결과가 0건이면 자연히 null이 되어 지도 패널에
  // 이전 선택이 남지 않는다.
  const selected = visibleItems.find((item) => item.key === selectedKey) ?? visibleItems[0] ?? null;

  const isFilteredEmpty = items.length > 0 && visibleItems.length === 0;
  const isFilterActive = search.trim().length > 0 || !isExplorerFiltersDefault(filters);

  if (items.length === 0) {
    return (
      <div className="grid gap-4">
        {header}
        <Card className="p-10 text-center">
          <p className="font-semibold text-forest">아직 매물 후보가 없습니다.</p>
          <p className="mt-2 text-sm text-ink/60">
            외부 사이트에서 확인한 매물을 저장하거나, 관리자가 프로젝트에 매물을 공유하면 이곳에 표시됩니다.
          </p>
        </Card>
      </div>
    );
  }

  // header(제목·배지·상단 CTA)는 데스크톱이거나 모바일 목록 모드일 때만
  // 보인다 — 모바일 지도 모드에서는 "화면 제목 또는 최소한의 문맥"만
  // 남기라는 요구를 토글 버튼 라벨 자체가 이미 충족하므로 숨긴다. header는
  // 눌러도 상태가 남지 않는 순수 표시용 콘텐츠라 마운트·언마운트돼도 잃을
  // 게 없다 — 검색·필터와 달리 여기서는 신경 쓸 필요가 없다.
  const showHeaderContext = isDesktop || mobileView === "list" || isFilteredEmpty;

  // 검색·필터는 화면에 항상 정확히 한 인스턴스만, 같은 DOM 위치에 렌더링한다.
  // 예전에는 이 자리를 모드에 따라 옮겨(위/아래) 그렸는데, 그러면 React가
  // 다른 트리 위치의 새 엘리먼트로 취급해 언마운트→재마운트한다 — SDK 인증
  // 확인이 지연되는 동안 사용자가 검색어를 입력했는데 그 직후
  // navermap_authFailure로 모바일 뷰가 지도→목록으로 자동 전환되면, 입력
  // 이벤트가 막 사라진 옛 input에 발생해 React state로 반영되지 못하고
  // 통째로 유실되는 버그가 실제로 재현됐다(포커스도 같이 끊긴다). search·
  // filters 상태 자체는 이미 이 컴포넌트(부모)가 들고 있어 자식이 다시
  // 마운트돼도 "값"은 안 사라지지만, 문제는 그 값이 되기 "직전"의 타이핑
  // 이벤트가 옛 DOM 노드와 함께 사라지는 것이었다 — 그래서 해법은 상태를
  // 더 위로 끌어올리는 게 아니라(이미 충분히 위에 있다), 이 컴포넌트를
  // 아예 트리에서 옮기지 않는 것이다. 대신 바깥 그리드에 이름 붙은 영역을
  // 두고, 모드별로 그 영역 배치(gridTemplateAreas)만 CSS로 바꾼다 —
  // DOM 노드는 하나로 고정, 위치만 시각적으로 이동한다.
  const searchAndFilters = (
    <div style={{ gridArea: "search" }} className="min-w-0">
      <ExplorerSearchAndFilters
        search={search}
        filters={filters}
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        isFilterActive={isFilterActive}
        resultCount={visibleItems.length}
        totalCount={items.length}
      />
    </div>
  );

  // 그리드 영역 배치. "toggle"은 모바일에서만 실제로 보이고(버튼 자체가
  // lg:hidden), "list"/"mapsummary"/"empty"는 각 아이템의 hidden 클래스가
  // 모드에 따라 따로 감추므로, 여기서는 "이 모드에서 무엇이 어디에
  // 있어야 하는가"만 정의한다 — 데스크톱은 항상 동일(1023→1024px
  // 경계에서도 순서가 안 바뀜), 모바일은 목록/지도 모드·결과 0건 여부로만
  // 갈린다.
  const gridTemplateAreas = isFilteredEmpty
    ? isDesktop
      ? '"search search" "empty empty"'
      : '"toggle" "search" "empty"'
    : isDesktop
      ? '"search search" "list mapsummary"'
      : mobileView === "map"
        ? '"toggle" "mapsummary" "search"'
        : '"toggle" "search" "list"';

  return (
    <div className="grid gap-4">
      {showHeaderContext && header}
      {/* 선택된 매물이 바뀔 때마다 안내한다 — 지도가 인터랙티브든 폴백이든
          목록만 보이는 모바일 상태든 항상 같은 곳에서 한 번만 알린다. */}
      <p aria-live="polite" className="sr-only">
        {selected ? `${selected.title} 선택됨` : ""}
      </p>

      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,38%)_minmax(0,1fr)] lg:items-start"
        style={{ gridTemplateAreas }}
      >
        {/* 모바일에서 첫 화면 안에 지도가 실제로 들어오려면, 검색·필터보다
            "목록/지도 전환"이 먼저 나와야 한다 — 위계: 제목 → 전환 → (모드별
            내용). 데스크톱은 lg:hidden이라 이 순서가 보이지 않는다. */}
        <div style={{ gridArea: "toggle" }} className="flex gap-2 lg:hidden" role="group" aria-label="목록·지도 전환">
          <button
            type="button"
            onClick={() => handleSelectView("list")}
            aria-pressed={mobileView === "list"}
            className={cn(
              "min-h-11 flex-1 rounded-full px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80",
              mobileView === "list" ? "bg-forest text-white" : "bg-white text-forest shadow-card",
            )}
          >
            목록 보기
          </button>
          <button
            type="button"
            onClick={() => handleSelectView("map")}
            aria-pressed={mobileView === "map"}
            className={cn(
              "min-h-11 flex-1 rounded-full px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80",
              mobileView === "map" ? "bg-forest text-white" : "bg-white text-forest shadow-card",
            )}
          >
            지도 보기
          </button>
        </div>

        {searchAndFilters}

        {isFilteredEmpty && (
          <div style={{ gridArea: "empty" }} className="min-w-0">
            <Card className="p-10 text-center">
              <p className="font-semibold text-forest">조건에 맞는 매물이 없습니다.</p>
              <p className="mt-2 text-sm text-ink/60">검색어나 필터를 조정해보세요.</p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-2.5 text-sm font-semibold text-forest hover:border-forest/40 focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80"
              >
                필터 초기화
              </button>
            </Card>
          </div>
        )}

        {!isFilteredEmpty && (
          <div
            style={{ gridArea: "list" }}
            className={cn("min-w-0 grid gap-4", mobileView === "map" && "hidden lg:grid")}
            role="list"
            aria-label="매물 후보 목록"
          >
            {visibleItems.map((item) => (
              <ExplorerListItem
                key={item.key}
                item={item}
                selected={item.key === selected?.key}
                onSelect={() => {
                  setSelectedKey(item.key);
                  handleSelectView("map");
                }}
                preference={matchablePreference}
              />
            ))}
          </div>
        )}

        {!isFilteredEmpty && (
          <div
            style={{ gridArea: "mapsummary" }}
            className={cn("min-w-0", mobileView === "list" && "hidden lg:block")}
          >
            <div className="grid gap-4 lg:sticky lg:top-20">
              {/* 지도로 돌아오는 유일한 복귀 버튼이라, 요약 카드보다 아래에
                  두면 짧은 화면(844×390 가로 모드 등)에서 스크롤해야만
                  보인다 — 지도 바로 위, 항상 스크롤 없이 닿는 위치에 둔다. */}
              {selected && (
                <button
                  type="button"
                  onClick={() => handleSelectView("list")}
                  className="min-h-11 rounded-full border border-forest/15 bg-white px-4 text-sm font-semibold text-forest hover:border-forest/40 lg:hidden"
                >
                  ← 목록으로
                </button>
              )}
              {/* 지도 영역의 접근 가능한 이름은 이 바깥 wrapper에 둔다 —
                  로딩 중·미설정·실패 등 어떤 상태를 보여주고 있어도
                  스크린리더 사용자가 항상 같은 이름으로 이 영역을 찾을 수
                  있게 한다(내부 SDK 렌더링 여부와 무관하게). */}
              <div role="region" aria-label="매물 위치 지도">
                <Card className="min-w-0 overflow-hidden p-0">
                  <InteractivePropertyMap
                    markers={markers}
                    selectedKey={selected?.key ?? null}
                    onSelectMarker={(key) => setSelectedKey(key)}
                    active={isDesktop || mobileView === "map"}
                    onStatusChange={handleMapStatusChange}
                    emptyMessage="표시할 위치 정보가 있는 매물이 없습니다."
                    // 모바일(lg 미만)에서는 dvh 기준으로 유동적으로 반응하되,
                    // 하단 고정 내비게이션(CustomerBottomNav, 약 4.5rem
                    // 확보분) 아래로 지도가 무한정 길어지지 않게 상한을
                    // 둔다 — 특정 기기 높이를 겨냥한 media query가 아니라
                    // 100dvh 기준 계산이라 화면 높이가 다른 기기에도 그대로
                    // 대응한다. lg 이상은 이 상한을 완전히 풀고 고정
                    // 520px를 쓴다(기존 값 그대로, 변경 없음). md:h-80은
                    // max-h-80과 값이 같아 원래도 항상 중복이었는데, 폭은
                    // 넓지만 높이가 짧은 가로 화면(844×390 등)에서는 이
                    // md 고정값이 오히려 100dvh 상한을 무시하고 320px를
                    // 강제해 하단 내비게이션과 겹치게 만들어 제거했다.
                    className="h-[60dvh] max-h-[min(20rem,calc(100dvh-4.5rem))] min-h-56 w-full lg:h-[520px] lg:max-h-none"
                    fallback={<MapFallback item={selected} mapConfigured={mapConfigured} />}
                  />
                </Card>
                <p className="mt-2 text-xs text-ink/50">
                  지도에는 위치 정보가 있는 매물만 표시됩니다 · {markers.length}/{visibleItems.length}건
                  {mapSdkStatus === "ready" && markers.length > 0 && " · 지도 제공: 네이버 클라우드 플랫폼"}
                </p>
              </div>
              {selected && <SelectedItemSummary item={selected} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExplorerSearchAndFilters({
  search,
  filters,
  onSearchChange,
  onFilterChange,
  onReset,
  isFilterActive,
  resultCount,
  totalCount,
}: {
  search: string;
  filters: ExplorerFilters;
  onSearchChange: (value: string) => void;
  onFilterChange: (filters: ExplorerFilters) => void;
  onReset: () => void;
  isFilterActive: boolean;
  resultCount: number;
  totalCount: number;
}) {
  // 필터 select 3종은 390px 첫 화면에서 지도가 보이도록 모바일(lg 미만)에서
  // 기본적으로 접어 둔다 — 검색창은 "핵심 검색 기능"이라 접지 않는다.
  // lg 이상에서는 filtersOpen 값과 무관하게 항상 펼쳐진 상태로 보인다
  // (아래 className의 lg:flex가 hidden을 덮어씀 — 이 파일의 다른 곳에서도
  // 쓰는 "조건부 hidden + 무조건 lg:*" 패턴과 동일).
  // 단, URL 쿼리로 필터가 이미 적용된 채 진입했다면(예: 공유 링크) 접어
  // 두지 않는다 — "현재 선택 상태를 유지"하려면 이미 켜진 필터를 사용자
  // 모르게 숨기면 안 된다.
  const activeSelectFilterCount = [
    filters.source !== "ALL",
    filters.transactionType !== "ALL",
    filters.status !== "ALL",
  ].filter(Boolean).length;
  const [filtersOpen, setFiltersOpen] = useState(() => activeSelectFilterCount > 0);

  // select 계열은 모두 같은 크기 규칙을 쓴다 — 16px 미만이면 iOS Safari가
  // 포커스 시 화면을 확대해버리므로, 화면 폭·방향과 무관하게 text-base(16px)를
  // 항상 유지한다(데스크톱에서도 sm:text-sm으로 줄이지 않는다 — 가로 모드
  // 같은 넓은 모바일 화면도 여전히 iOS 입력 컨트롤이라 확대 문제가 그대로
  // 적용된다). box-border로 padding을 폭에 포함시키고 min-w-0·max-w-full로
  // 그리드 칸을 벗어나지 않게 한다.
  // 기본값("전체")이 아닌 선택은 시각적으로 눈에 띄게 강조한다 — 필터가
  // 적용된 상태를 select 자체의 색만 보고도 알아챌 수 있게.
  function selectClassName(isNonDefault: boolean) {
    return cn(
      "box-border min-h-11 w-full min-w-0 max-w-full truncate rounded-full border px-3 text-base focus:outline-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80 sm:w-auto",
      isNonDefault
        ? "border-forest bg-mint/30 font-bold text-forest"
        : "border-forest/15 bg-white font-semibold text-forest focus:border-forest/40",
    );
  }

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3">
      <label htmlFor="explorer-search" className="sr-only">
        매물 이름, 주소, 프로젝트명으로 검색
      </label>
      <input
        id="explorer-search"
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="매물 이름, 주소, 프로젝트명으로 검색"
        // type=search도 같은 이유(iOS 확대 방지)로 text-base를 화면 폭과
        // 무관하게 유지한다(sm:text-sm로 줄이지 않는다).
        className="box-border min-h-11 w-full min-w-0 max-w-full rounded-full border border-forest/15 bg-white px-4 text-base text-forest placeholder:text-ink/40 focus:border-forest/40 focus:outline-none sm:max-w-sm"
      />

      <button
        type="button"
        onClick={() => setFiltersOpen((open) => !open)}
        aria-expanded={filtersOpen}
        aria-controls="explorer-filter-panel"
        className="flex min-h-11 w-full items-center justify-between rounded-full border border-forest/15 bg-white px-4 text-sm font-semibold text-forest focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80 lg:hidden"
      >
        <span>필터{activeSelectFilterCount > 0 ? ` · ${activeSelectFilterCount}개 적용 중` : ""}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", filtersOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <div
        id="explorer-filter-panel"
        className={cn(
          "grid w-full min-w-0 max-w-full grid-cols-2 items-center gap-2 lg:flex lg:flex-wrap",
          !filtersOpen && "hidden lg:flex",
        )}
        role="group"
        aria-label="매물 필터"
      >
        <label className="sr-only" htmlFor="explorer-filter-source">
          출처
        </label>
        <select
          id="explorer-filter-source"
          value={filters.source}
          onChange={(event) => onFilterChange({ ...filters, source: event.target.value as ExplorerFilters["source"] })}
          className={selectClassName(filters.source !== "ALL")}
        >
          {explorerSourceFilterValues.map((value) => (
            <option key={value} value={value}>
              {explorerSourceFilterLabels[value]}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="explorer-filter-transaction">
          거래 유형
        </label>
        <select
          id="explorer-filter-transaction"
          value={filters.transactionType}
          onChange={(event) => onFilterChange({ ...filters, transactionType: event.target.value })}
          className={selectClassName(filters.transactionType !== "ALL")}
        >
          <option value="ALL">거래 유형 전체</option>
          <option value={UNSPECIFIED_TRANSACTION_FILTER}>거래 유형 미입력</option>
          {candidatePropertyTransactionTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="explorer-filter-status">
          진행 상태
        </label>
        <select
          id="explorer-filter-status"
          value={filters.status}
          onChange={(event) => onFilterChange({ ...filters, status: event.target.value as ExplorerFilters["status"] })}
          className={selectClassName(filters.status !== "ALL")}
        >
          <option value="ALL">진행 상태 전체</option>
          {normalizedExplorerStatuses.map((status) => (
            <option key={status} value={status}>
              {normalizedExplorerStatusLabels[status]}
            </option>
          ))}
        </select>

        {isFilterActive && (
          <button
            type="button"
            onClick={onReset}
            className="box-border col-span-2 min-h-11 w-full min-w-0 max-w-full rounded-full border border-forest/15 bg-white px-3 text-base font-semibold text-forest hover:border-forest/40 focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80 lg:col-span-1 lg:w-auto lg:text-sm"
          >
            필터 초기화
          </button>
        )}
      </div>

      <p aria-live="polite" className="text-xs font-semibold text-ink/50">
        {isFilterActive ? `${resultCount}건 표시 중 (전체 ${totalCount}건)` : `전체 ${totalCount}건`}
      </p>
    </div>
  );
}

function ExplorerListItem({
  item,
  selected,
  onSelect,
  preference,
}: {
  item: PropertyExplorerItem;
  selected: boolean;
  onSelect: () => void;
  preference: MatchablePreference;
}) {
  const badge = sourceBadge(item);
  return (
    <div
      role="listitem"
      className={cn(
        // Card 컴포넌트의 rounded-[24px]과 시각적으로 같은 반경(24px)이지만
        // 다른 클래스를 쓴다 — E2E 테스트가 카드를 `.rounded-\[24px\]`
        // 셀렉터로 찾는 경우 이 감싸는 wrapper까지 같이 잡혀 중복 매치가
        // 나는 것을 막는다(rounded-3xl = 1.5rem = 24px, Tailwind 기본값).
        "min-w-0 rounded-3xl",
        selected && "ring-2 ring-forest ring-offset-2 ring-offset-cream/60",
      )}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={cn(
              "min-w-0 max-w-full whitespace-normal break-words rounded-full px-3 py-1 text-left text-xs font-bold",
              badge.className,
            )}
          >
            {badge.label}
          </span>
          {!item.hasCoordinates && (
            <span className="min-w-0 max-w-full whitespace-normal break-words rounded-full bg-ink/10 px-3 py-1 text-left text-xs font-bold text-ink/55">
              위치 확인 필요
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className={cn(
            "min-h-11 shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80",
            selected
              ? "border-forest bg-forest text-white"
              : "border-forest/15 bg-white text-forest hover:border-forest/40",
          )}
        >
          {selected ? "지도에 표시 중" : "지도에서 보기"}
        </button>
      </div>
      {item.displayStage === "SAVED" ? (
        <CandidatePropertyCard item={item.card} preference={preference} />
      ) : (
        <ul className="grid gap-0">
          <PropertySuggestionCustomerCard item={item.card} />
        </ul>
      )}
    </div>
  );
}

/**
 * 인터랙티브 지도가 미설정이거나 로딩에 실패했을 때 대신 보여준다. 직접
 * 저장·관리자 공유에서 저장한 매물(SAVED)은 기존 정지 이미지 지도
 * 엔드포인트를 그대로 재사용할 수 있어 StaticPropertyMap을 쓰고, 아직
 * 저장 전인 공유 매물(SUGGESTED)은 그 전용 정지 지도 라우트가 없으므로
 * 주소 텍스트로 대체한다("실패하면 기존 StaticPropertyMap 또는 주소
 * 목록으로 fallback"의 "또는" 쪽).
 */
function MapFallback({ item, mapConfigured }: { item: PropertyExplorerItem | null; mapConfigured: boolean }) {
  if (!item) {
    return (
      <Card className="p-6 text-center text-sm text-ink/55">
        왼쪽 목록에서 매물을 선택하면 위치를 확인할 수 있습니다.
      </Card>
    );
  }

  if (item.displayStage === "SAVED") {
    return (
      <div>
        <p className="px-4 pt-4 text-center text-xs font-semibold text-ink/50">
          지도를 사용할 수 없어 선택한 매물 1건의 위치만 보여드립니다.
        </p>
        <StaticPropertyMap
          candidateId={item.id}
          address={item.address}
          title={item.title}
          mapConfigured={mapConfigured}
          hasCoordinates={item.hasCoordinates}
          imgClassName="h-48 w-full max-w-full object-cover"
          className="h-48"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-1 p-6 text-center text-sm text-ink/55">
      <p className="text-xs font-semibold text-ink/50">
        지도를 사용할 수 없어 선택한 매물 1건의 위치만 보여드립니다.
      </p>
      <p className="font-semibold text-forest">{item.title}</p>
      <p className="break-words">{item.address || "주소 미입력"}</p>
    </div>
  );
}

function SelectedItemSummary({ item }: { item: PropertyExplorerItem }) {
  const badge = sourceBadge(item);
  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="grid min-w-0 gap-2">
        <span
          className={cn(
            "min-w-0 max-w-full whitespace-normal break-words rounded-full px-3 py-1 text-left text-xs font-bold",
            badge.className,
          )}
        >
          {badge.label}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-cream px-3 py-1 text-xs font-bold text-forest">
            {item.transactionType ?? "거래 유형 미입력"}
          </span>
          <span className="text-xl font-black text-forest">{priceSummary(item.card)}</span>
        </div>
        <p className="min-w-0 break-words text-lg font-black text-forest">{item.title}</p>
        <p className="min-w-0 break-words text-sm text-ink/60">{item.address || "주소 미입력"}</p>
        {!item.hasCoordinates && (
          <p className="text-xs font-semibold text-ink/50">위치 확인 필요 — 아직 지도에 표시할 좌표가 없습니다.</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <Link
            href={
              item.displayStage === "SAVED" ? `/my/candidate-properties/${item.id}` : `/projects/${item.projectId}`
            }
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 text-sm font-bold text-white hover:bg-forest/90"
          >
            {item.displayStage === "SAVED" ? "상세보기 →" : "프로젝트에서 확인하기 →"}
          </Link>
          <a
            href={item.card.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-0 items-center gap-1 text-sm font-semibold text-ink/60 hover:text-forest hover:underline"
          >
            원본 매물 보기
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </a>
        </div>
      </div>
    </Card>
  );
}
