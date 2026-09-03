import { describe, expect, it } from "vitest";
import {
  applyExplorerQuery,
  buildSavedExplorerItem,
  buildSuggestedExplorerItem,
  computeMapViewport,
  dedupeSuggestionsAgainstSaved,
  defaultExplorerQuery,
  explorerFallbackStatuses,
  explorerQueryToParams,
  filterExplorerItems,
  mergeExplorerQueryIntoParams,
  normalizedExplorerStatuses,
  parseExplorerQueryFromParams,
  searchExplorerItems,
  sortExplorerItems,
  toMapMarkers,
  UNSPECIFIED_TRANSACTION_FILTER,
  type ExplorerFilters,
  type PropertyExplorerItem,
} from "@/lib/propertyExplorer";

function savedProperty(overrides: Partial<Parameters<typeof buildSavedExplorerItem>[0]> = {}) {
  return {
    id: "cand-1",
    title: "거제시 아주동 24평",
    address: "경남 거제시 아주동",
    sourceUrl: "https://fin.land.naver.com/x",
    transactionType: "전세",
    price: null,
    deposit: 300_000_000,
    monthlyRent: null,
    area: 79.3,
    roomCount: 3,
    availableDateISO: null,
    status: "관심",
    createdAt: "2026-08-01T00:00:00.000Z",
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

function suggestedProperty(overrides: Partial<Parameters<typeof buildSuggestedExplorerItem>[0]> = {}) {
  return {
    id: "sugg-1",
    projectId: "proj-1",
    projectName: "알림QA프로젝트",
    title: "신내역 프라디움",
    address: "서울시 중랑구",
    sourceUrl: "https://fin.land.naver.com/y",
    transactionType: "매매",
    price: 500_000_000,
    deposit: null,
    monthlyRent: null,
    area: 59.9,
    roomCount: 2,
    availableDateISO: null,
    sharedReason: "희망 지역 안에 있습니다.",
    cautionNote: null,
    customerStatus: "NEW",
    savedCandidatePropertyId: null,
    createdAt: "2026-08-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildSavedExplorerItem", () => {
  it("좌표가 둘 다 있으면 hasCoordinates가 true다", () => {
    const item = buildSavedExplorerItem(savedProperty({ latitude: 37.5, longitude: 127.0 }));
    expect(item.hasCoordinates).toBe(true);
    expect(item.displayStage).toBe("SAVED");
    expect(item.key).toBe("saved:cand-1");
  });

  it("좌표가 하나라도 없으면 hasCoordinates가 false다", () => {
    expect(buildSavedExplorerItem(savedProperty({ latitude: 37.5, longitude: null })).hasCoordinates).toBe(false);
    expect(buildSavedExplorerItem(savedProperty({ latitude: null, longitude: null })).hasCoordinates).toBe(false);
  });

  it("suggestionOrigin이 없으면 origin이 DIRECT다", () => {
    const item = buildSavedExplorerItem(savedProperty());
    expect(item.origin).toBe("DIRECT");
    expect(item.projectName).toBeNull();
  });

  it("suggestionOrigin이 있으면 origin이 ADMIN_SHARED이고 프로젝트명을 갖는다", () => {
    const item = buildSavedExplorerItem(savedProperty({ suggestionOrigin: { projectName: "알림QA프로젝트" } }));
    expect(item.origin).toBe("ADMIN_SHARED");
    expect(item.projectName).toBe("알림QA프로젝트");
  });

  it("status를 정규화된 진행 상태로 변환한다", () => {
    expect(buildSavedExplorerItem(savedProperty({ status: "최종 후보" })).normalizedStatus).toBe("FINAL");
    expect(buildSavedExplorerItem(savedProperty({ status: "보류" })).normalizedStatus).toBe("ON_HOLD");
  });

  it("카드에 필요한 필드를 그대로 옮긴다", () => {
    const item = buildSavedExplorerItem(savedProperty());
    expect(item.card).toMatchObject({
      id: "cand-1",
      title: "거제시 아주동 24평",
      deposit: 300_000_000,
      status: "관심",
    });
  });
});

describe("buildSuggestedExplorerItem", () => {
  it("좌표를 넘기지 않으면 hasCoordinates가 false다(관리자 공유 매물도 지오코딩된 좌표를 가질 수 있다 — '좌표 있는 매물' 관련 테스트는 아래 '좌표 유효성' 묶음 참고)", () => {
    const item = buildSuggestedExplorerItem(suggestedProperty());
    expect(item.hasCoordinates).toBe(false);
    expect(item.displayStage).toBe("SUGGESTED");
    expect(item.origin).toBe("ADMIN_SHARED");
    expect(item.key).toBe("suggested:sugg-1");
    expect(item.projectId).toBe("proj-1");
    expect(item.projectName).toBe("알림QA프로젝트");
  });

  it("customerStatus를 정규화된 진행 상태로 변환한다", () => {
    expect(buildSuggestedExplorerItem(suggestedProperty({ customerStatus: "NEW" })).normalizedStatus).toBe(
      "SUGGESTION_NEW",
    );
    expect(buildSuggestedExplorerItem(suggestedProperty({ customerStatus: "VIEWED" })).normalizedStatus).toBe(
      "SUGGESTION_NEW",
    );
    expect(buildSuggestedExplorerItem(suggestedProperty({ customerStatus: "ON_HOLD" })).normalizedStatus).toBe(
      "ON_HOLD",
    );
    expect(buildSuggestedExplorerItem(suggestedProperty({ customerStatus: "EXPIRED" })).normalizedStatus).toBe(
      "SUGGESTION_EXPIRED",
    );
  });

  it("카드에 필요한 필드를 그대로 옮긴다", () => {
    const item = buildSuggestedExplorerItem(suggestedProperty());
    expect(item.card).toMatchObject({
      id: "sugg-1",
      title: "신내역 프라디움",
      customerStatus: "NEW",
      sharedReason: "희망 지역 안에 있습니다.",
    });
  });
});

describe("sortExplorerItems", () => {
  it("최신순(내림차순)으로 정렬한다", () => {
    const older = buildSavedExplorerItem(savedProperty({ id: "a", createdAt: "2026-08-01T00:00:00.000Z" }));
    const newer = buildSuggestedExplorerItem(suggestedProperty({ id: "b", createdAt: "2026-08-05T00:00:00.000Z" }));
    const sorted = sortExplorerItems([older, newer]);
    expect(sorted.map((item) => item.key)).toEqual(["suggested:b", "saved:a"]);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const items = [
      buildSavedExplorerItem(savedProperty({ id: "a", createdAt: "2026-08-01T00:00:00.000Z" })),
      buildSuggestedExplorerItem(suggestedProperty({ id: "b", createdAt: "2026-08-05T00:00:00.000Z" })),
    ];
    const original = [...items];
    sortExplorerItems(items);
    expect(items).toEqual(original);
  });
});

describe("dedupeSuggestionsAgainstSaved", () => {
  it("저장된 후보로 이어진 공유 매물은 뺀다", () => {
    const suggestions = [
      suggestedProperty({ id: "s1", savedCandidatePropertyId: "cand-1" }),
      suggestedProperty({ id: "s2", savedCandidatePropertyId: null }),
    ];
    const result = dedupeSuggestionsAgainstSaved(suggestions, [{ id: "cand-1" }]);
    expect(result.map((s) => s.id)).toEqual(["s2"]);
  });

  it("savedCandidatePropertyId가 있어도 이번 조회 결과(savedProperties)에 없으면 남긴다(방어적 교차 확인)", () => {
    const suggestions = [suggestedProperty({ id: "s1", savedCandidatePropertyId: "cand-없음" })];
    const result = dedupeSuggestionsAgainstSaved(suggestions, [{ id: "cand-1" }]);
    expect(result.map((s) => s.id)).toEqual(["s1"]);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const suggestions = [suggestedProperty({ id: "s1", savedCandidatePropertyId: null })];
    const original = [...suggestions];
    dedupeSuggestionsAgainstSaved(suggestions, []);
    expect(suggestions).toEqual(original);
  });
});

describe("searchExplorerItems", () => {
  const saved = buildSavedExplorerItem(savedProperty({ id: "a", title: "역삼 센트럴", address: "서울시 강남구 역삼동" }));
  const suggested = buildSuggestedExplorerItem(
    suggestedProperty({ id: "b", title: "신내역 프라디움", address: "서울시 중랑구", projectName: "이사프로젝트" }),
  );
  const items: PropertyExplorerItem[] = [saved, suggested];

  it("빈 검색어는 전체를 반환한다", () => {
    expect(searchExplorerItems(items, "").map((i) => i.key)).toEqual([saved.key, suggested.key]);
    expect(searchExplorerItems(items, "   ").map((i) => i.key)).toEqual([saved.key, suggested.key]);
  });

  it("매물 이름으로 검색한다(대소문자·공백 무시)", () => {
    expect(searchExplorerItems(items, "역삼").map((i) => i.key)).toEqual([saved.key]);
  });

  it("주소로 검색한다", () => {
    expect(searchExplorerItems(items, "중랑구").map((i) => i.key)).toEqual([suggested.key]);
  });

  it("프로젝트명으로 검색한다", () => {
    expect(searchExplorerItems(items, "이사프로젝트").map((i) => i.key)).toEqual([suggested.key]);
  });

  it("영문 검색어도 대소문자를 무시한다", () => {
    const englishItem = buildSavedExplorerItem(savedProperty({ id: "c", title: "Onnest Tower" }));
    expect(searchExplorerItems([englishItem], "onnest tower").map((i) => i.key)).toEqual([englishItem.key]);
    expect(searchExplorerItems([englishItem], "ONNEST").map((i) => i.key)).toEqual([englishItem.key]);
  });

  it("연속 공백이 섞여 있어도 매칭한다", () => {
    expect(searchExplorerItems(items, "역삼   센트럴").map((i) => i.key)).toEqual([saved.key]);
  });

  it("일치하는 항목이 없으면 빈 배열을 반환한다", () => {
    expect(searchExplorerItems(items, "존재하지않는매물명")).toEqual([]);
  });

  it("출처 URL이나 공유 이유는 검색 대상이 아니다", () => {
    expect(searchExplorerItems(items, "fin.land.naver.com")).toEqual([]);
    expect(searchExplorerItems(items, "희망 지역 안에 있습니다")).toEqual([]);
  });
});

describe("filterExplorerItems", () => {
  const direct = buildSavedExplorerItem(savedProperty({ id: "a", transactionType: "전세", status: "관심" }));
  const adminSaved = buildSavedExplorerItem(
    savedProperty({ id: "b", transactionType: "매매", status: "최종 후보", suggestionOrigin: { projectName: "P" } }),
  );
  const suggested = buildSuggestedExplorerItem(
    suggestedProperty({ id: "c", transactionType: "매매", customerStatus: "NEW" }),
  );
  const items: PropertyExplorerItem[] = [direct, adminSaved, suggested];

  it("source=ALL이면 전부 통과한다", () => {
    expect(filterExplorerItems(items, { source: "ALL", transactionType: "ALL", status: "ALL" })).toHaveLength(3);
  });

  it("source=ADMIN_SHARED는 SUGGESTED와 관리자 공유에서 저장한 SAVED를 모두 포함한다", () => {
    const result = filterExplorerItems(items, { source: "ADMIN_SHARED", transactionType: "ALL", status: "ALL" });
    expect(result.map((i) => i.key)).toEqual([adminSaved.key, suggested.key]);
  });

  it("거래 유형으로 필터링한다", () => {
    const result = filterExplorerItems(items, { source: "ALL", transactionType: "전세", status: "ALL" });
    expect(result.map((i) => i.key)).toEqual([direct.key]);
  });

  it("진행 상태로 필터링한다", () => {
    const result = filterExplorerItems(items, { source: "ALL", transactionType: "ALL", status: "FINAL" });
    expect(result.map((i) => i.key)).toEqual([adminSaved.key]);
  });

  it("세 조건을 AND로 결합한다", () => {
    const result = filterExplorerItems(items, { source: "ADMIN_SHARED", transactionType: "매매", status: "SUGGESTION_NEW" });
    expect(result.map((i) => i.key)).toEqual([suggested.key]);
  });

  it("결합 순서를 바꿔도(개념적으로 독립) 같은 결과를 낸다", () => {
    const filters: ExplorerFilters = { source: "ADMIN_SHARED", transactionType: "매매", status: "ALL" };
    const result1 = filterExplorerItems(items, filters);
    const result2 = filterExplorerItems([...items].reverse(), filters);
    expect(new Set(result1.map((i) => i.key))).toEqual(new Set(result2.map((i) => i.key)));
  });

  it("원본 배열을 변경하지 않는다", () => {
    const original = [...items];
    filterExplorerItems(items, { source: "DIRECT", transactionType: "ALL", status: "ALL" });
    expect(items).toEqual(original);
  });
});

describe("applyExplorerQuery", () => {
  it("필터·검색을 모두 만족하는 항목만 최신순으로 반환한다", () => {
    const older = buildSavedExplorerItem(
      savedProperty({ id: "a", title: "역삼 A", createdAt: "2026-08-01T00:00:00.000Z" }),
    );
    const newer = buildSavedExplorerItem(
      savedProperty({ id: "b", title: "역삼 B", createdAt: "2026-08-05T00:00:00.000Z" }),
    );
    const unrelated = buildSuggestedExplorerItem(suggestedProperty({ id: "c", title: "무관한 매물" }));

    const result = applyExplorerQuery([older, newer, unrelated], {
      search: "역삼",
      filters: { source: "ALL", transactionType: "ALL", status: "ALL" },
    });
    expect(result.map((i) => i.key)).toEqual([newer.key, older.key]);
  });

  it("검색/필터 결과가 0건이면 빈 배열을 반환한다(지도에 이전 선택이 남지 않는다)", () => {
    const item = buildSavedExplorerItem(savedProperty());
    const result = applyExplorerQuery([item], {
      search: "일치하지않음",
      filters: { source: "ALL", transactionType: "ALL", status: "ALL" },
    });
    expect(result).toEqual([]);
  });

  it("기본 쿼리(검색어 없음·필터 전체)로 초기화하면 항상 최신순 전체 목록이다", () => {
    const older = buildSavedExplorerItem(savedProperty({ id: "a", createdAt: "2026-08-01T00:00:00.000Z" }));
    const newer = buildSuggestedExplorerItem(suggestedProperty({ id: "b", createdAt: "2026-08-05T00:00:00.000Z" }));
    const result = applyExplorerQuery([older, newer], defaultExplorerQuery);
    expect(result.map((i) => i.key)).toEqual([newer.key, older.key]);
  });
});

describe("URL 쿼리 파라미터 직렬화·복원", () => {
  it("기본값은 파라미터를 하나도 만들지 않는다", () => {
    expect(explorerQueryToParams(defaultExplorerQuery).toString()).toBe("");
  });

  it("검색어·필터를 쿼리스트링으로 직렬화한다", () => {
    const params = explorerQueryToParams({
      search: "역삼",
      filters: { source: "ADMIN_SHARED", transactionType: "전세", status: "FINAL" },
    });
    expect(params.get("q")).toBe("역삼");
    expect(params.get("source")).toBe("ADMIN_SHARED");
    expect(params.get("transaction")).toBe("전세");
    expect(params.get("status")).toBe("FINAL");
  });

  it("직렬화한 쿼리스트링을 다시 파싱하면 같은 상태로 복원된다(왕복 검증)", () => {
    const original: typeof defaultExplorerQuery = {
      search: "신내역",
      filters: { source: "DIRECT", transactionType: "매매", status: "ON_HOLD" },
    };
    const restored = parseExplorerQueryFromParams(explorerQueryToParams(original));
    expect(restored).toEqual(original);
  });

  it("허용되지 않은 값은 무시하고 기본값을 쓴다", () => {
    const params = new URLSearchParams("source=INVALID&transaction=단독주택&status=NOT_A_STATUS");
    expect(parseExplorerQueryFromParams(params)).toEqual(defaultExplorerQuery);
  });
});

describe("거래 유형 '미입력' 필터", () => {
  it("transactionType이 null인 항목만 통과시킨다", () => {
    const unspecified = buildSavedExplorerItem(savedProperty({ id: "a", transactionType: null }));
    const specified = buildSavedExplorerItem(savedProperty({ id: "b", transactionType: "전세" }));
    const result = filterExplorerItems([unspecified, specified], {
      source: "ALL",
      transactionType: UNSPECIFIED_TRANSACTION_FILTER,
      status: "ALL",
    });
    expect(result.map((i) => i.key)).toEqual([unspecified.key]);
  });

  it("transactionType이 빈 문자열인 항목도 '미입력'으로 취급한다", () => {
    const empty = buildSuggestedExplorerItem(suggestedProperty({ id: "a", transactionType: "" }));
    const specified = buildSuggestedExplorerItem(suggestedProperty({ id: "b", transactionType: "매매" }));
    const result = filterExplorerItems([empty, specified], {
      source: "ALL",
      transactionType: UNSPECIFIED_TRANSACTION_FILTER,
      status: "ALL",
    });
    expect(result.map((i) => i.key)).toEqual([empty.key]);
  });

  it("URL 파라미터로도 왕복된다(직렬화·복원)", () => {
    const query = { search: "", filters: { source: "ALL", transactionType: UNSPECIFIED_TRANSACTION_FILTER, status: "ALL" } } as const;
    const params = explorerQueryToParams(query);
    expect(params.get("transaction")).toBe(UNSPECIFIED_TRANSACTION_FILTER);
    expect(parseExplorerQueryFromParams(params).filters.transactionType).toBe(UNSPECIFIED_TRANSACTION_FILTER);
  });

  it("허용되지 않은 거래 유형 URL 값은 전체 보기로 처리한다", () => {
    const params = new URLSearchParams("transaction=단독주택");
    expect(parseExplorerQueryFromParams(params).filters.transactionType).toBe("ALL");
  });
});

describe("공유 매물 상태 정규화 방어 처리", () => {
  it("SAVED는 '새로 확인할 공유 매물'이 아닌 별도 값으로 구분한다", () => {
    const item = buildSuggestedExplorerItem(suggestedProperty({ customerStatus: "SAVED" }));
    expect(item.normalizedStatus).toBe("SUGGESTION_UNEXPECTED_SAVED");
    expect(item.normalizedStatus).not.toBe("SUGGESTION_NEW");
  });

  it("정의되지 않은 상태 문자열도 '새로 확인할 공유 매물'로 오인하지 않는다", () => {
    const item = buildSuggestedExplorerItem(suggestedProperty({ customerStatus: "이상한값" }));
    expect(item.normalizedStatus).toBe("SUGGESTION_UNKNOWN");
    expect(item.normalizedStatus).not.toBe("SUGGESTION_NEW");
  });

  it("정상 상태(NEW·VIEWED)는 기존과 동일하게 SUGGESTION_NEW로 매핑된다(회귀 방지)", () => {
    expect(buildSuggestedExplorerItem(suggestedProperty({ customerStatus: "NEW" })).normalizedStatus).toBe(
      "SUGGESTION_NEW",
    );
    expect(buildSuggestedExplorerItem(suggestedProperty({ customerStatus: "VIEWED" })).normalizedStatus).toBe(
      "SUGGESTION_NEW",
    );
  });

  it("방어용 상태값은 필터 드롭다운 목록(normalizedExplorerStatuses)에 노출되지 않는다", () => {
    for (const fallback of explorerFallbackStatuses) {
      expect(normalizedExplorerStatuses).not.toContain(fallback);
    }
  });
});

describe("mergeExplorerQueryIntoParams", () => {
  it("이 화면이 모르는 기존 파라미터는 그대로 유지한다", () => {
    const base = new URLSearchParams("utm_source=newsletter&ref=abc");
    const merged = mergeExplorerQueryIntoParams(base, {
      search: "역삼",
      filters: { source: "DIRECT", transactionType: "ALL", status: "ALL" },
    });
    expect(merged.get("utm_source")).toBe("newsletter");
    expect(merged.get("ref")).toBe("abc");
    expect(merged.get("q")).toBe("역삼");
    expect(merged.get("source")).toBe("DIRECT");
  });

  it("q/source/transaction/status 네 키만 갱신하고, 기본값으로 돌아가면 해당 키를 지운다", () => {
    const base = new URLSearchParams("q=old&source=DIRECT&keep=1");
    const merged = mergeExplorerQueryIntoParams(base, defaultExplorerQuery);
    expect(merged.get("q")).toBeNull();
    expect(merged.get("source")).toBeNull();
    expect(merged.get("keep")).toBe("1");
  });

  it("원본 URLSearchParams를 변경하지 않는다", () => {
    const base = new URLSearchParams("q=old");
    const baseString = base.toString();
    mergeExplorerQueryIntoParams(base, { search: "new", filters: { source: "ALL", transactionType: "ALL", status: "ALL" } });
    expect(base.toString()).toBe(baseString);
  });
});

describe("좌표 유효성(비정상 좌표 제외)", () => {
  it("위도·경도가 유효 범위를 벗어나면 hasCoordinates가 false다", () => {
    expect(buildSavedExplorerItem(savedProperty({ latitude: 91, longitude: 127 })).hasCoordinates).toBe(false);
    expect(buildSavedExplorerItem(savedProperty({ latitude: 37.5, longitude: 181 })).hasCoordinates).toBe(false);
    expect(buildSavedExplorerItem(savedProperty({ latitude: -91, longitude: -127 })).hasCoordinates).toBe(false);
  });

  it("NaN·Infinity는 유효하지 않은 좌표로 취급한다", () => {
    expect(buildSavedExplorerItem(savedProperty({ latitude: NaN, longitude: 127 })).hasCoordinates).toBe(false);
    expect(buildSavedExplorerItem(savedProperty({ latitude: 37.5, longitude: Infinity })).hasCoordinates).toBe(false);
  });

  it("정상 범위 좌표는 latitude/longitude를 그대로 보존한다", () => {
    const item = buildSavedExplorerItem(savedProperty({ latitude: 37.5, longitude: 127.0 }));
    expect(item.hasCoordinates).toBe(true);
    expect(item.latitude).toBe(37.5);
    expect(item.longitude).toBe(127.0);
  });

  it("관리자 공유 매물(SUGGESTED)도 같은 규칙으로 좌표를 검증한다", () => {
    const valid = buildSuggestedExplorerItem(suggestedProperty({ latitude: 34.88, longitude: 128.62 }));
    expect(valid.hasCoordinates).toBe(true);
    expect(valid.latitude).toBe(34.88);

    const invalid = buildSuggestedExplorerItem(suggestedProperty({ latitude: 999, longitude: 128.62 }));
    expect(invalid.hasCoordinates).toBe(false);
    expect(invalid.latitude).toBeNull();
  });

  it("좌표 필드를 아예 넘기지 않아도(생략) hasCoordinates가 false다", () => {
    const item = buildSuggestedExplorerItem(suggestedProperty());
    expect(item.hasCoordinates).toBe(false);
    expect(item.latitude).toBeNull();
    expect(item.longitude).toBeNull();
  });
});

describe("toMapMarkers", () => {
  it("좌표가 있는 항목만 마커로 변환한다", () => {
    const withCoords = buildSavedExplorerItem(savedProperty({ id: "a", latitude: 37.5, longitude: 127.0 }));
    const withoutCoords = buildSavedExplorerItem(savedProperty({ id: "b", latitude: null, longitude: null }));
    const markers = toMapMarkers([withCoords, withoutCoords]);
    expect(markers.map((m) => m.id)).toEqual(["a"]);
  });

  it("직접 저장·관리자 공유에서 저장·좌표가 있는 미저장 공유 매물을 모두 마커로 바꾼다", () => {
    const direct = buildSavedExplorerItem(savedProperty({ id: "a", latitude: 1, longitude: 1 }));
    const savedFromShare = buildSavedExplorerItem(
      savedProperty({ id: "b", latitude: 2, longitude: 2, suggestionOrigin: { projectName: "P" } }),
    );
    const unsavedShare = buildSuggestedExplorerItem(suggestedProperty({ id: "c", latitude: 3, longitude: 3 }));
    const markers = toMapMarkers([direct, savedFromShare, unsavedShare]);
    expect(markers.map((m) => m.id).sort()).toEqual(["a", "b", "c"]);
    expect(markers.find((m) => m.id === "b")?.origin).toBe("ADMIN_SHARED");
    expect(markers.find((m) => m.id === "c")?.displayStage).toBe("SUGGESTED");
  });

  it("0건이면 빈 배열을 반환한다", () => {
    const item = buildSavedExplorerItem(savedProperty({ latitude: null, longitude: null }));
    expect(toMapMarkers([item])).toEqual([]);
  });

  it("필터·검색 결과에 맞춰 호출하면(applyExplorerQuery와 조합) 마커도 함께 바뀐다", () => {
    const seoul = buildSavedExplorerItem(savedProperty({ id: "a", title: "역삼", latitude: 1, longitude: 1 }));
    const busan = buildSavedExplorerItem(savedProperty({ id: "b", title: "해운대", latitude: 2, longitude: 2 }));
    const filtered = applyExplorerQuery([seoul, busan], {
      search: "역삼",
      filters: { source: "ALL", transactionType: "ALL", status: "ALL" },
    });
    expect(toMapMarkers(filtered).map((m) => m.id)).toEqual(["a"]);
  });
});

describe("computeMapViewport", () => {
  it("마커가 0건이면 empty를 반환한다(이전 마커가 남지 않는다)", () => {
    expect(computeMapViewport([])).toEqual({ kind: "empty" });
  });

  it("마커가 1건이면 그 지점을 중심으로 한 single을 반환한다", () => {
    expect(computeMapViewport([{ lat: 37.5, lng: 127.0 }])).toEqual({
      kind: "single",
      center: { lat: 37.5, lng: 127.0 },
    });
  });

  it("마커가 여러 건이면 전체를 포함하는 bounds를 반환한다", () => {
    const result = computeMapViewport([
      { lat: 37.5, lng: 127.0 },
      { lat: 35.1, lng: 129.0 },
      { lat: 36.0, lng: 126.5 },
    ]);
    expect(result).toEqual({
      kind: "bounds",
      sw: { lat: 35.1, lng: 126.5 },
      ne: { lat: 37.5, lng: 129.0 },
    });
  });

  it("모든 마커가 같은 좌표면 bounds 대신 single로 처리한다(0 크기 확대 방지)", () => {
    const result = computeMapViewport([
      { lat: 37.5, lng: 127.0 },
      { lat: 37.5, lng: 127.0 },
    ]);
    expect(result).toEqual({ kind: "single", center: { lat: 37.5, lng: 127.0 } });
  });
});
