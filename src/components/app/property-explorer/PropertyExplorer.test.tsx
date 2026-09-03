// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PropertyExplorer } from "./PropertyExplorer";
import { buildSavedExplorerItem } from "@/lib/propertyExplorer";

/**
 * "지도 제공: 네이버 클라우드 플랫폼" 캡션은 인터랙티브 지도가 실제로
 * 렌더링됐을 때만 보여야 한다(디자인 피드백 3번) — 이건 InteractivePropertyMap
 * 내부 SDK 상태(status)에 달려 있어 실제 컴포넌트를 렌더링해서 확인해야
 * 하고, E2E는 NEXT_PUBLIC_NCP_MAP_CLIENT_ID를 항상 비워 "unconfigured"
 * 상태로만 고정되므로(playwright.config.ts) "ready" 상태는 여기서만
 * 결정적으로 재현할 수 있다. InteractivePropertyMap.test.tsx와 같은 방식으로
 * window.naver.maps를 가짜로 심어 실제 네트워크 없이 "ready"까지 도달한다.
 */

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

type FakeLatLng = { lat: number; lng: number; kind: "LatLng" };

function createFakeNaverMaps() {
  const listeners: { target: unknown; event: string; handler: () => void }[] = [];
  return {
    Map: vi.fn(function (this: unknown) {
      return { setCenter: vi.fn(), setZoom: vi.fn(), fitBounds: vi.fn(), panTo: vi.fn(), destroy: vi.fn() };
    }),
    Marker: vi.fn(function (this: unknown) {
      return { setMap: vi.fn(), setIcon: vi.fn(), setPosition: vi.fn() };
    }),
    LatLng: vi.fn(function (lat: number, lng: number): FakeLatLng {
      return { lat, lng, kind: "LatLng" };
    }),
    LatLngBounds: vi.fn(function () {
      return {};
    }),
    Size: vi.fn(function (width: number, height: number) {
      return { width, height };
    }),
    Point: vi.fn(function (x: number, y: number) {
      return { x, y };
    }),
    Event: {
      addListener: vi.fn((target: unknown, event: string, handler: () => void) => {
        const entry = { target, event, handler };
        listeners.push(entry);
        return entry;
      }),
      removeListener: vi.fn(),
      trigger: vi.fn(),
    },
  };
}

class FakeResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

function savedItemWithCoordinates(
  overrides: {
    hasCoordinates?: boolean;
    id?: string;
    title?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  } = {},
) {
  const hasCoordinates = overrides.hasCoordinates ?? true;
  return buildSavedExplorerItem({
    id: overrides.id ?? "p1",
    title: overrides.title ?? "역삼동 24평",
    address: overrides.address ?? "서울시 강남구 역삼동",
    sourceUrl: `https://fin.land.naver.com/complexes/${overrides.id ?? "1"}`,
    transactionType: "전세",
    price: null,
    deposit: 10000,
    monthlyRent: null,
    area: 24,
    roomCount: 2,
    availableDateISO: null,
    status: "관심",
    createdAt: new Date().toISOString(),
    latitude: hasCoordinates ? (overrides.latitude ?? 37.5) : null,
    longitude: hasCoordinates ? (overrides.longitude ?? 127.03) : null,
  });
}

const CAPTION_TEXT = /지도 제공: 네이버 클라우드 플랫폼/;

describe("PropertyExplorer — 지도 제공 캡션은 지도 상태에 따라 조건부로 렌더링된다", () => {
  beforeEach(() => {
    // 이 파일의 테스트는 desktop 여부(useIsDesktopViewport)를 다루지 않는다
    // — jsdom에는 matchMedia가 없어 항상 폴리필이 필요하고, false(모바일
    // 기준) 고정으로 충분하다(캡션 조건은 isDesktop과 무관하다).
    window.matchMedia =
      window.matchMedia ??
      ((): MediaQueryList =>
        ({
          matches: false,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList);
    global.ResizeObserver = FakeResizeObserver;
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    delete window.naver;
    delete window.navermap_authFailure;
    delete window.__onnestNaverMapsSdkPromise;
    // @ts-expect-error 테스트 정리
    delete global.ResizeObserver;
    vi.restoreAllMocks();
  });

  it("인터랙티브 지도가 실제로 준비되면(가짜 SDK ready) 캡션이 보인다", async () => {
    vi.stubEnv("NEXT_PUBLIC_NCP_MAP_CLIENT_ID", "test-client-id");
    window.naver = { maps: createFakeNaverMaps() };

    render(
      <PropertyExplorer items={[savedItemWithCoordinates()]} preference={null} mapConfigured />,
    );

    await waitFor(() => expect(screen.getByText(CAPTION_TEXT)).not.toBeNull());
  });

  it("SDK가 미설정(unconfigured)이면 캡션이 보이지 않는다", async () => {
    // NEXT_PUBLIC_NCP_MAP_CLIENT_ID를 stub하지 않는다 — getPublicClientId()가
    // null을 돌려줘 즉시 "unconfigured"로 확정된다.
    render(
      <PropertyExplorer items={[savedItemWithCoordinates()]} preference={null} mapConfigured={false} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/지도에는 위치 정보가 있는 매물만 표시됩니다/)).not.toBeNull();
    });
    expect(screen.queryByText(CAPTION_TEXT)).toBeNull();
  });

  it("인증이 뒤늦게 실패(error)하면 캡션이 다시 숨겨진다", async () => {
    vi.stubEnv("NEXT_PUBLIC_NCP_MAP_CLIENT_ID", "test-client-id");
    window.naver = { maps: createFakeNaverMaps() };

    render(
      <PropertyExplorer items={[savedItemWithCoordinates()]} preference={null} mapConfigured />,
    );

    await waitFor(() => expect(screen.getByText(CAPTION_TEXT)).not.toBeNull());

    window.navermap_authFailure?.();

    await waitFor(() => expect(screen.queryByText(CAPTION_TEXT)).toBeNull());
  });

  it("좌표가 있는 매물이 없으면(마커 0건) 캡션이 보이지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_NCP_MAP_CLIENT_ID", "test-client-id");
    window.naver = { maps: createFakeNaverMaps() };

    render(
      <PropertyExplorer
        items={[savedItemWithCoordinates({ hasCoordinates: false })]}
        preference={null}
        mapConfigured={false}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/표시할 위치 정보가 있는 매물이 없습니다/)).not.toBeNull();
    });
    expect(screen.queryByText(CAPTION_TEXT)).toBeNull();
  });
});

describe("PropertyExplorer — SDK 인증 확인이 지연되는 동안 입력한 검색어는 유실되지 않는다", () => {
  beforeEach(() => {
    window.matchMedia =
      window.matchMedia ??
      ((): MediaQueryList =>
        ({
          matches: false,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList);
    global.ResizeObserver = FakeResizeObserver;
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    delete window.naver;
    delete window.navermap_authFailure;
    delete window.__onnestNaverMapsSdkPromise;
    // @ts-expect-error 테스트 정리
    delete global.ResizeObserver;
    vi.restoreAllMocks();
  });

  it("인증 실패로 지도→목록 자동 전환이 일어나도 입력 중이던 검색어·필터 결과가 유지되고 검색창은 하나만 존재한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_NCP_MAP_CLIENT_ID", "test-client-id");
    window.naver = { maps: createFakeNaverMaps() };

    const gangnamItem = savedItemWithCoordinates({
      id: "gangnam",
      title: "강남역 24평 전세",
      address: "서울특별시 강남구 역삼동",
      latitude: 37.4979,
      longitude: 127.0276,
    });
    const hongdaeItem = savedItemWithCoordinates({
      id: "hongdae",
      title: "홍대입구 투룸 월세",
      address: "서울특별시 마포구 서교동",
      latitude: 37.5563,
      longitude: 126.9237,
    });

    render(<PropertyExplorer items={[gangnamItem, hongdaeItem]} preference={null} mapConfigured />);

    // 좌표가 있으니 초기 mobileView는 "map"이고, 가짜 SDK가 이미 준비돼
    // 있어 "ready"까지 도달한다(= 실제 인증 확인이 아직 안 끝난, 성공한
    // 것처럼 보이는 순간을 흉내낸다) — 캡션이 뜨는 것으로 확인한다.
    await waitFor(() => expect(screen.getByText(CAPTION_TEXT)).not.toBeNull());

    // 이 시점(지도 모드)에서 검색·필터 DOM은 지도·요약 아래("search"
    // 그리드 영역)에 있다 — 사용자가 여기에 타이핑한다.
    const searchInput = screen.getByPlaceholderText("매물 이름, 주소, 프로젝트명으로 검색") as HTMLInputElement;
    expect(screen.getAllByPlaceholderText("매물 이름, 주소, 프로젝트명으로 검색")).toHaveLength(1);
    fireEvent.change(searchInput, { target: { value: "강남" } });
    expect(searchInput.value).toBe("강남");

    // 뒤늦게 NCP 인증이 실패한다 — handleMapStatusChange가 mobileView를
    // "map"에서 "list"로 자동으로 되돌린다. 검색·필터는 이제 그리드
    // 영역이 "list" 아래("search")가 아니라 목록 위("search")로 바뀌지만,
    // DOM 노드 자체는 옮겨 다니지 않아야 한다(재마운트되면 안 됨).
    window.navermap_authFailure?.();

    await waitFor(() => expect(screen.queryByText(CAPTION_TEXT)).toBeNull());

    // 검색창이 여전히 하나만 존재하고, 값도 그대로 남아 있어야 한다.
    const searchInputsAfter = screen.getAllByPlaceholderText("매물 이름, 주소, 프로젝트명으로 검색");
    expect(searchInputsAfter).toHaveLength(1);
    expect((searchInputsAfter[0] as HTMLInputElement).value).toBe("강남");

    // 검색 결과도 입력한 검색어에 맞게 유지된다(강남만 남고 홍대는 빠짐).
    const list = screen.getByRole("list", { name: "매물 후보 목록" });
    await waitFor(() => {
      expect(list.textContent).toContain("강남역 24평 전세");
      expect(list.textContent).not.toContain("홍대입구 투룸 월세");
    });
  });
});
