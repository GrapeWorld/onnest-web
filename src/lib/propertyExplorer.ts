import type { CandidatePropertyCardItem } from "@/components/app/CandidatePropertyCard";
import type { CustomerPropertySuggestionItem } from "@/components/app/PropertySuggestionCustomerCard";
import { candidatePropertyTransactionTypes } from "@/data/candidateProperty";

/**
 * 고객이 직접 저장한 매물(CandidateProperty)과 관리자가 프로젝트에 공유한
 * 매물(ProjectPropertySuggestion)을 한 목록에 섞어 보여주기 위한 공통 형태.
 * 두 원본 모델을 합치는 새 모델·API를 만들지 않고, 화면에 필요한 만큼만
 * 이 타입으로 정규화한다 — 각 항목은 여전히 기존 카드 컴포넌트
 * (CandidatePropertyCard/PropertySuggestionCustomerCard)가 그대로 쓸 수
 * 있는 `card` 필드를 들고 있다.
 *
 * `displayStage`(화면에 어떤 카드로 보이는지: 저장된 매물인지, 아직
 * 저장 전인 공유 매물인지)와 `origin`(원래 어디서 왔는지: 고객이 직접
 * 저장했는지, 관리자 공유를 저장했는지)은 서로 다른 축이다. 관리자가
 * 공유한 매물을 고객이 저장하면 displayStage는 SUGGESTED에서 SAVED로
 * 바뀌지만 origin은 계속 ADMIN_SHARED다 — 이 두 축을 하나의 `source`
 * 값으로 합쳐뒀던 것이 화면에 같은 매물이 두 번(공유 카드+저장 카드)
 * 나타나는 문제의 원인이었다.
 */
export type ExplorerOrigin = "DIRECT" | "ADMIN_SHARED";

/**
 * 화면 전용 정규화 진행 상태. CandidateProperty.status·
 * ProjectPropertySuggestion.customerStatus 두 DB 값 집합을 그대로 두고
 * (마이그레이션 없음), 필터 UI에서만 쓰는 화면 개념으로만 매핑한다.
 */
export const normalizedExplorerStatuses = [
  "INTEREST",
  "VISIT_PLANNED",
  "VISIT_DONE",
  "ON_HOLD",
  "FINAL",
  "SUGGESTION_NEW",
  "SUGGESTION_INTERESTED",
  "SUGGESTION_NOT_INTERESTED",
  "SUGGESTION_EXPIRED",
] as const;
/**
 * 정상 흐름에서는 나오면 안 되는 방어용 값 — 필터 드롭다운(normalizedExplorerStatuses)에는
 * 넣지 않는다. dedupeSuggestionsAgainstSaved를 거치지 않은 채 이미 저장된
 * 공유 건이 이 함수까지 들어오거나, DB에 정의되지 않은 문자열이 들어왔을 때
 * "새로 확인할 공유 매물"로 조용히 오인되는 것을 막기 위한 구분자다.
 */
export const explorerFallbackStatuses = ["SUGGESTION_UNEXPECTED_SAVED", "SUGGESTION_UNKNOWN"] as const;

export type NormalizedExplorerStatus =
  | (typeof normalizedExplorerStatuses)[number]
  | (typeof explorerFallbackStatuses)[number];

export const normalizedExplorerStatusLabels: Record<NormalizedExplorerStatus, string> = {
  INTEREST: "관심",
  VISIT_PLANNED: "방문 예정",
  VISIT_DONE: "방문 완료",
  ON_HOLD: "보류",
  FINAL: "최종 후보",
  SUGGESTION_NEW: "새로 확인할 공유 매물",
  SUGGESTION_INTERESTED: "관심 있음(공유 매물)",
  SUGGESTION_NOT_INTERESTED: "관심 없음(공유 매물)",
  SUGGESTION_EXPIRED: "원본 매물 확인 필요",
  SUGGESTION_UNEXPECTED_SAVED: "저장 처리됨(목록에 표시되면 안 됨)",
  SUGGESTION_UNKNOWN: "알 수 없는 상태",
};

function normalizeCandidateStatus(status: string): NormalizedExplorerStatus {
  switch (status) {
    case "방문 예정":
      return "VISIT_PLANNED";
    case "방문 완료":
      return "VISIT_DONE";
    case "보류":
      return "ON_HOLD";
    case "최종 후보":
      return "FINAL";
    default:
      return "INTEREST";
  }
}

function normalizeSuggestionStatus(customerStatus: string): NormalizedExplorerStatus {
  switch (customerStatus) {
    case "NEW":
    case "VIEWED":
      // 아직 고객이 반응하지 않은 상태를 하나로 묶는다.
      return "SUGGESTION_NEW";
    case "INTERESTED":
      return "SUGGESTION_INTERESTED";
    case "ON_HOLD":
      return "ON_HOLD";
    case "NOT_INTERESTED":
      return "SUGGESTION_NOT_INTERESTED";
    case "EXPIRED":
      return "SUGGESTION_EXPIRED";
    case "SAVED":
      // dedupeSuggestionsAgainstSaved에서 걸러져야 정상이라 실제로는
      // 나오면 안 되는 값이다 — 그래도 "새로 확인할 공유 매물"로 잘못
      // 표시하지 않도록 명시적으로 구분한다.
      return "SUGGESTION_UNEXPECTED_SAVED";
    default:
      return "SUGGESTION_UNKNOWN";
  }
}

export type SavedExplorerItem = {
  displayStage: "SAVED";
  origin: ExplorerOrigin;
  key: string;
  id: string;
  title: string;
  address: string | null;
  createdAt: string;
  /** 지도에 표시할 좌표가 캐시돼 있는지. hasCoordinates가 true일 때만 latitude/longitude가 유효한 숫자다. */
  hasCoordinates: boolean;
  latitude: number | null;
  longitude: number | null;
  transactionType: string | null;
  normalizedStatus: NormalizedExplorerStatus;
  /** origin이 ADMIN_SHARED일 때만 값이 있다 — 이 매물을 공유한 프로젝트명. */
  projectName: string | null;
  card: CandidatePropertyCardItem;
};

export type SuggestedExplorerItem = {
  displayStage: "SUGGESTED";
  origin: "ADMIN_SHARED";
  key: string;
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  address: string | null;
  createdAt: string;
  // 관리자가 입력한 주소를 저장 시점에 지오코딩해 캐시한다
  // (ProjectPropertySuggestion.latitude/longitude) — 고객이 "내 매물 후보에
  // 저장"하면 그 시점에 CandidateProperty로 좌표가 별도로 다시 채워진다.
  hasCoordinates: boolean;
  latitude: number | null;
  longitude: number | null;
  transactionType: string | null;
  normalizedStatus: NormalizedExplorerStatus;
  card: CustomerPropertySuggestionItem;
};

export type PropertyExplorerItem = SavedExplorerItem | SuggestedExplorerItem;

/** DB에 저장된 값이라도 방어적으로 유효 범위를 확인한다(위도 -90~90, 경도 -180~180, 유한값). */
function isValidCoordinatePair(lat: number | null, lng: number | null): boolean {
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function buildSavedExplorerItem(property: {
  id: string;
  title: string;
  address: string | null;
  sourceUrl: string;
  transactionType: string | null;
  price: number | null;
  deposit: number | null;
  monthlyRent: number | null;
  area: number | null;
  roomCount: number | null;
  availableDateISO: string | null;
  status: string;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  /** 관리자 공유를 저장해 만들어진 후보라면 그 원본 프로젝트 정보를 넣는다. */
  suggestionOrigin?: { projectName: string } | null;
}): SavedExplorerItem {
  const hasCoordinates = isValidCoordinatePair(property.latitude, property.longitude);
  return {
    displayStage: "SAVED",
    origin: property.suggestionOrigin ? "ADMIN_SHARED" : "DIRECT",
    key: `saved:${property.id}`,
    id: property.id,
    title: property.title,
    address: property.address,
    createdAt: property.createdAt,
    hasCoordinates,
    latitude: hasCoordinates ? property.latitude : null,
    longitude: hasCoordinates ? property.longitude : null,
    transactionType: property.transactionType,
    normalizedStatus: normalizeCandidateStatus(property.status),
    projectName: property.suggestionOrigin?.projectName ?? null,
    card: {
      id: property.id,
      sourceUrl: property.sourceUrl,
      title: property.title,
      address: property.address,
      transactionType: property.transactionType,
      price: property.price,
      deposit: property.deposit,
      monthlyRent: property.monthlyRent,
      area: property.area,
      roomCount: property.roomCount,
      availableDate: property.availableDateISO ? new Date(property.availableDateISO) : null,
      status: property.status,
    },
  };
}

export function buildSuggestedExplorerItem(suggestion: {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  address: string | null;
  sourceUrl: string;
  transactionType: string | null;
  price: number | null;
  deposit: number | null;
  monthlyRent: number | null;
  area: number | null;
  roomCount: number | null;
  availableDateISO: string | null;
  sharedReason: string | null;
  cautionNote: string | null;
  customerStatus: string;
  savedCandidatePropertyId: string | null;
  createdAt: string;
  latitude?: number | null;
  longitude?: number | null;
}): SuggestedExplorerItem {
  const hasCoordinates = isValidCoordinatePair(suggestion.latitude ?? null, suggestion.longitude ?? null);
  return {
    displayStage: "SUGGESTED",
    origin: "ADMIN_SHARED",
    key: `suggested:${suggestion.id}`,
    id: suggestion.id,
    projectId: suggestion.projectId,
    projectName: suggestion.projectName,
    title: suggestion.title,
    address: suggestion.address,
    createdAt: suggestion.createdAt,
    hasCoordinates,
    latitude: hasCoordinates ? (suggestion.latitude as number) : null,
    longitude: hasCoordinates ? (suggestion.longitude as number) : null,
    transactionType: suggestion.transactionType,
    normalizedStatus: normalizeSuggestionStatus(suggestion.customerStatus),
    card: {
      id: suggestion.id,
      sourceUrl: suggestion.sourceUrl,
      title: suggestion.title,
      address: suggestion.address,
      transactionType: suggestion.transactionType,
      price: suggestion.price,
      deposit: suggestion.deposit,
      monthlyRent: suggestion.monthlyRent,
      area: suggestion.area,
      roomCount: suggestion.roomCount,
      availableDate: suggestion.availableDateISO,
      sharedReason: suggestion.sharedReason,
      cautionNote: suggestion.cautionNote,
      customerStatus: suggestion.customerStatus,
      savedCandidatePropertyId: suggestion.savedCandidatePropertyId,
      createdAt: suggestion.createdAt,
    },
  };
}

/** 직접 저장·관리자 공유를 구분하지 않고 최신순으로 섞어 보여준다. */
export function sortExplorerItems<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * 고객이 "내 매물 후보에 저장"을 완료한 공유 매물은 이미 SAVED 카드로
 * 목록에 나타나므로, 원본 SUGGESTED 카드는 뺀다. `savedCandidatePropertyId`
 * 하나만으로도 저장 여부를 판단할 수 있지만(FK가 onDelete: SetNull이라
 * 후보가 지워지면 항상 같이 null이 된다), 실제로 그 후보가 이번에 같이
 * 조회됐는지까지 Map으로 교차 확인해 방어적으로 판단한다. `suggestions.filter`
 * 안에서 `savedProperties.find(...)`를 부르는 식(호출마다 배열 전체를
 * 다시 훑는 O(n²))은 목록이 커지면 느려지므로 쓰지 않는다.
 */
export function dedupeSuggestionsAgainstSaved<S extends { savedCandidatePropertyId: string | null }>(
  suggestions: S[],
  savedProperties: { id: string }[],
): S[] {
  const savedIds = new Map(savedProperties.map((property) => [property.id, true] as const));
  return suggestions.filter(
    (suggestion) => !suggestion.savedCandidatePropertyId || !savedIds.has(suggestion.savedCandidatePropertyId),
  );
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function collectSearchableText(item: PropertyExplorerItem): string {
  return [item.title, item.address ?? "", item.projectName ?? ""].join(" ");
}

/**
 * 매물 이름·주소·프로젝트명만으로 검색한다. 출처 URL·관리자 메모(adminMemo,
 * 애초에 이 화면에는 내려오지도 않는다)·외부 페이지 내용은 검색 대상이
 * 아니다 — 서버가 외부 URL을 절대 조회하지 않는다는 원칙과 같은 이유로,
 * 여기서도 "우리가 직접 입력받은 텍스트"만 검색한다.
 */
export function searchExplorerItems(items: PropertyExplorerItem[], query: string): PropertyExplorerItem[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;
  return items.filter((item) => normalizeSearchText(collectSearchableText(item)).includes(normalizedQuery));
}

export const explorerSourceFilterValues = ["ALL", "DIRECT", "ADMIN_SHARED"] as const;
export type ExplorerSourceFilterValue = (typeof explorerSourceFilterValues)[number];

export const explorerSourceFilterLabels: Record<ExplorerSourceFilterValue, string> = {
  ALL: "출처 전체",
  DIRECT: "직접 저장",
  ADMIN_SHARED: "관리자 공유",
};

/**
 * 거래 유형이 비어 있는(null 또는 빈 문자열) 매물만 골라 보는 화면 전용
 * 필터 값. CandidateProperty.transactionType·ProjectPropertySuggestion.transactionType
 * 둘 다 원래 nullable이라 DB 값은 그대로 두고, 필터에만 이 값을 추가한다.
 */
export const UNSPECIFIED_TRANSACTION_FILTER = "UNSPECIFIED";

export type ExplorerTransactionFilterValue = "ALL" | typeof UNSPECIFIED_TRANSACTION_FILTER | string;

export type ExplorerFilters = {
  source: ExplorerSourceFilterValue;
  /** "ALL" | "UNSPECIFIED"(거래 유형 미입력) | candidatePropertyTransactionTypes의 값 하나. */
  transactionType: ExplorerTransactionFilterValue;
  /** "ALL" 또는 NormalizedExplorerStatus 값 하나. */
  status: "ALL" | NormalizedExplorerStatus;
};

export const defaultExplorerFilters: ExplorerFilters = {
  source: "ALL",
  transactionType: "ALL",
  status: "ALL",
};

export function isExplorerFiltersDefault(filters: ExplorerFilters): boolean {
  return (
    filters.source === defaultExplorerFilters.source &&
    filters.transactionType === defaultExplorerFilters.transactionType &&
    filters.status === defaultExplorerFilters.status
  );
}

/**
 * 세 조건을 AND로 결합한다. 각 조건은 서로 독립적으로 검사하므로 순서는
 * 결과에 영향을 주지 않고, 입력 배열도 변경하지 않는다(Array.prototype.filter는
 * 항상 새 배열을 반환한다).
 */
export function filterExplorerItems(items: PropertyExplorerItem[], filters: ExplorerFilters): PropertyExplorerItem[] {
  return items.filter((item) => {
    if (filters.source !== "ALL" && item.origin !== filters.source) return false;
    if (filters.transactionType === UNSPECIFIED_TRANSACTION_FILTER) {
      if (item.transactionType != null && item.transactionType !== "") return false;
    } else if (filters.transactionType !== "ALL" && item.transactionType !== filters.transactionType) {
      return false;
    }
    if (filters.status !== "ALL" && item.normalizedStatus !== filters.status) return false;
    return true;
  });
}

export type ExplorerQuery = {
  search: string;
  filters: ExplorerFilters;
};

export const defaultExplorerQuery: ExplorerQuery = {
  search: "",
  filters: defaultExplorerFilters,
};

/** 필터 → 검색 → 정렬(최신순) 순서로 적용한다. 초기화하면 항상 최신순 전체 목록으로 돌아온다. */
export function applyExplorerQuery(items: PropertyExplorerItem[], query: ExplorerQuery): PropertyExplorerItem[] {
  return sortExplorerItems(searchExplorerItems(filterExplorerItems(items, query.filters), query.search));
}

const EXPLORER_STATUS_VALUES = new Set<string>(normalizedExplorerStatuses);
const EXPLORER_TRANSACTION_VALUES = new Set<string>([
  UNSPECIFIED_TRANSACTION_FILTER,
  ...candidatePropertyTransactionTypes,
]);

/** URL 쿼리스트링(?q=&source=&transaction=&status=)에서 화면 상태를 복원한다. 허용 값 밖이면 무시하고 기본값을 쓴다. */
export function parseExplorerQueryFromParams(params: URLSearchParams): ExplorerQuery {
  const source = params.get("source");
  const transaction = params.get("transaction");
  const status = params.get("status");
  return {
    search: params.get("q") ?? "",
    filters: {
      source: source != null && explorerSourceFilterValues.includes(source as ExplorerSourceFilterValue)
        ? (source as ExplorerSourceFilterValue)
        : "ALL",
      transactionType: transaction != null && EXPLORER_TRANSACTION_VALUES.has(transaction) ? transaction : "ALL",
      status: status != null && EXPLORER_STATUS_VALUES.has(status) ? (status as NormalizedExplorerStatus) : "ALL",
    },
  };
}

/** 화면 상태를 URL 쿼리스트링으로 직렬화한다. 기본값인 항목은 아예 쓰지 않아 URL을 짧게 유지한다. */
export function explorerQueryToParams(query: ExplorerQuery): URLSearchParams {
  const params = new URLSearchParams();
  const trimmedSearch = query.search.trim();
  if (trimmedSearch) params.set("q", trimmedSearch);
  if (query.filters.source !== "ALL") params.set("source", query.filters.source);
  if (query.filters.transactionType !== "ALL") params.set("transaction", query.filters.transactionType);
  if (query.filters.status !== "ALL") params.set("status", query.filters.status);
  return params;
}

/** 이 화면이 아는 쿼리 파라미터 키뿐이다 — 그 밖의 키(예: 다른 화면이 남긴 파라미터)는 손대지 않는다. */
const EXPLORER_QUERY_PARAM_KEYS = ["q", "source", "transaction", "status"] as const;

/**
 * 현재 URL에 이미 있는(이 화면이 모르는 것을 포함한) 쿼리 파라미터를
 * 유지한 채로, 이 화면이 관리하는 네 키(q/source/transaction/status)만
 * 갱신한다. 허용되지 않는 값으로 필터를 만들 수 없으므로(모든 setter가
 * ExplorerFilters 타입을 거친다) 별도의 "잘못된 값 제거" 로직 없이도
 * 항상 유효한 값만 쓰인다.
 */
export function mergeExplorerQueryIntoParams(base: URLSearchParams, query: ExplorerQuery): URLSearchParams {
  const merged = new URLSearchParams(base);
  for (const key of EXPLORER_QUERY_PARAM_KEYS) merged.delete(key);
  for (const [key, value] of explorerQueryToParams(query)) merged.set(key, value);
  return merged;
}

/** 인터랙티브 지도에 마커 하나를 그리는 데 필요한 최소 정보. */
export type PropertyMapMarkerData = {
  key: string;
  id: string;
  title: string;
  address: string | null;
  lat: number;
  lng: number;
  displayStage: PropertyExplorerItem["displayStage"];
  origin: ExplorerOrigin;
  projectName: string | null;
};

/**
 * 좌표가 있는 항목만 마커 데이터로 바꾼다 — 직접 저장·관리자 공유에서
 * 저장한 매물·좌표가 있는 미저장 관리자 공유 매물을 모두 같은 방식으로
 * 다룬다. 좌표가 없거나(hasCoordinates=false) 비정상 값이면(빌드 함수에서
 * 이미 걸러진다) 이 목록에서 빠지고, 목록 카드 쪽에는 "위치 확인 필요"로
 * 계속 남는다.
 */
export function toMapMarkers(items: PropertyExplorerItem[]): PropertyMapMarkerData[] {
  const markers: PropertyMapMarkerData[] = [];
  for (const item of items) {
    if (!item.hasCoordinates || item.latitude == null || item.longitude == null) continue;
    markers.push({
      key: item.key,
      id: item.id,
      title: item.title,
      address: item.address,
      lat: item.latitude,
      lng: item.longitude,
      displayStage: item.displayStage,
      origin: item.origin,
      projectName: item.projectName,
    });
  }
  return markers;
}

export type MapViewport =
  | { kind: "empty" }
  | { kind: "single"; center: { lat: number; lng: number } }
  | { kind: "bounds"; sw: { lat: number; lng: number }; ne: { lat: number; lng: number } };

/**
 * 마커 좌표만으로 지도가 처음 보여줄 범위를 계산한다(순수 함수 — 실제
 * naver.maps.LatLngBounds는 SDK가 로딩된 뒤 이 결과를 넘겨 만든다).
 * 0건이면 "empty"(이전 마커가 남지 않도록 호출부가 지도를 비운다), 1건이면
 * 그 지점을 중심으로 한 기본 확대 수준을 쓰고, 여러 건이면 전체가 보이는
 * bounds를 준다. 모든 마커가 같은 좌표면 bounds 크기가 0이 되어 과도하게
 * 확대되므로 단일 지점과 같은 방식으로 처리한다.
 */
export function computeMapViewport(markers: { lat: number; lng: number }[]): MapViewport {
  if (markers.length === 0) return { kind: "empty" };
  if (markers.length === 1) return { kind: "single", center: { lat: markers[0].lat, lng: markers[0].lng } };

  let minLat = markers[0].lat;
  let maxLat = markers[0].lat;
  let minLng = markers[0].lng;
  let maxLng = markers[0].lng;
  for (const marker of markers) {
    if (marker.lat < minLat) minLat = marker.lat;
    if (marker.lat > maxLat) maxLat = marker.lat;
    if (marker.lng < minLng) minLng = marker.lng;
    if (marker.lng > maxLng) maxLng = marker.lng;
  }

  if (minLat === maxLat && minLng === maxLng) {
    return { kind: "single", center: { lat: minLat, lng: minLng } };
  }
  return { kind: "bounds", sw: { lat: minLat, lng: minLng }, ne: { lat: maxLat, lng: maxLng } };
}
