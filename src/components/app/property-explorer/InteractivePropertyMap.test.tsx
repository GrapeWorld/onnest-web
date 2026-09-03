// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { InteractivePropertyMap, triggerMapResize } from "./InteractivePropertyMap";
import type { PropertyMapMarkerData } from "@/lib/propertyExplorer";

/**
 * 실제 NCP Dynamic Map SDK를 외부 CDN에서 받아오지 않는다(jsdom은 기본
 * 설정에서 <script src>를 실행하지 않아 실제 SDK로는 "ready" 상태에 영원히
 * 도달할 수 없다) — 대신 `window.naver.maps`를 흉내 낸 가짜 객체를 미리
 * 심어둔다. NaverMapLoader.ts의 loadNaverMapsSdk는 `window.naver?.maps`가
 * 이미 있으면 스크립트를 만들지 않고 곧바로 resolve하므로, 이 방식으로
 * 실제 네트워크 없이 "ready" 상태까지 결정적으로 도달할 수 있다.
 *
 * 여기서 검증하는 것은 이 컴포넌트가 (가짜)SDK를 올바른 순서·인자로
 * 부르는지뿐이다 — 실제 NCP SDK의 최종 동작(도메인 인증, 실제 타일
 * 렌더링 등)은 이 테스트로 증명되지 않는다. 그건 실기기·로컬 브라우저
 * 수동 확인 대상이다.
 */

type FakeLatLng = { lat: number; lng: number; kind: "LatLng" };
type FakeSize = { width: number; height: number; kind: "Size" };
type FakePoint = { x: number; y: number; kind: "Point" };
type FakeBounds = { sw: FakeLatLng; ne: FakeLatLng; kind: "Bounds" };

type FakeIcon = { content: string; size: FakeSize; anchor: FakePoint };

type FakeMarkerOptions = { position: FakeLatLng; map: FakeMap; icon: FakeIcon };

class FakeMarker {
  position: FakeLatLng;
  map: FakeMap | null;
  icon: FakeIcon;
  setMap = vi.fn((map: FakeMap | null) => {
    this.map = map;
  });
  setIcon = vi.fn((icon: FakeIcon) => {
    this.icon = icon;
  });
  setPosition = vi.fn((position: FakeLatLng) => {
    this.position = position;
  });
  constructor(options: FakeMarkerOptions) {
    this.position = options.position;
    this.map = options.map;
    this.icon = options.icon;
  }
}

class FakeMap {
  container: HTMLElement;
  center: FakeLatLng;
  zoom: number;
  destroyed = false;
  setCenter = vi.fn((center: FakeLatLng) => {
    this.center = center;
  });
  setZoom = vi.fn((zoom: number) => {
    this.zoom = zoom;
  });
  fitBounds = vi.fn();
  panTo = vi.fn((center: FakeLatLng) => {
    this.center = center;
  });
  autoResize = vi.fn();
  destroy = vi.fn(() => {
    this.destroyed = true;
  });
  constructor(container: HTMLElement, options: { center: FakeLatLng; zoom: number }) {
    this.container = container;
    this.center = options.center;
    this.zoom = options.zoom;
  }
}

type ListenerEntry = { target: unknown; event: string; handler: (...args: unknown[]) => void };

function createFakeNaverMaps() {
  const listeners: ListenerEntry[] = [];
  // vi.fn()으로 감싼 화살표 함수는 원본이 화살표 함수라 `new`로 호출할 수
  // 없다("is not a constructor") — 이 SDK의 LatLng/Size/Point/Map/Marker는
  // 전부 `new naver.maps.X(...)` 형태로 쓰이므로, 반드시 일반 function
  // 표현식으로 감싼다.
  const maps = {
    Map: vi.fn(function (this: unknown, container: HTMLElement, options: { center: FakeLatLng; zoom: number }) {
      return new FakeMap(container, options);
    }),
    Marker: vi.fn(function (this: unknown, options: FakeMarkerOptions) {
      return new FakeMarker(options);
    }),
    LatLng: vi.fn(function (lat: number, lng: number): FakeLatLng {
      return { lat, lng, kind: "LatLng" };
    }),
    LatLngBounds: vi.fn(function (sw: FakeLatLng, ne: FakeLatLng): FakeBounds {
      return { sw, ne, kind: "Bounds" };
    }),
    Size: vi.fn(function (width: number, height: number): FakeSize {
      return { width, height, kind: "Size" };
    }),
    Point: vi.fn(function (x: number, y: number): FakePoint {
      return { x, y, kind: "Point" };
    }),
    Event: {
      addListener: vi.fn((target: unknown, event: string, handler: (...args: unknown[]) => void) => {
        const entry = { target, event, handler };
        listeners.push(entry);
        return entry;
      }),
      removeListener: vi.fn((entry: ListenerEntry) => {
        const index = listeners.indexOf(entry);
        if (index >= 0) listeners.splice(index, 1);
      }),
      trigger: vi.fn((target: unknown, event: string) => {
        for (const entry of listeners) {
          if (entry.target === target && entry.event === event) entry.handler();
        }
      }),
    },
  };
  return { maps, listeners };
}

/**
 * jsdom은 ResizeObserver를 제공하지 않는다 — beforeEach/afterEach에서 매
 * 테스트마다 새로 심고 항상 걷어내, 실패한 테스트가 다음 테스트에 전역
 * 오염을 남기지 않게 한다(테스트 하나가 assert에서 던져도 정리는 always 돈다).
 */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  callback: () => void;
  constructor(callback: () => void) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  trigger() {
    this.callback();
  }
}

function marker(overrides: Partial<PropertyMapMarkerData> = {}): PropertyMapMarkerData {
  return {
    key: "saved:a",
    id: "a",
    title: "역삼동 24평",
    address: "서울시 강남구",
    lat: 37.5,
    lng: 127.0,
    displayStage: "SAVED",
    origin: "DIRECT",
    projectName: null,
    ...overrides,
  };
}

describe("InteractivePropertyMap (가짜 window.naver.maps SDK 사용)", () => {
  let fakeNaver: ReturnType<typeof createFakeNaverMaps>;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_NCP_MAP_CLIENT_ID", "test-client-id");
    fakeNaver = createFakeNaverMaps();
    window.naver = fakeNaver;
    FakeResizeObserver.instances = [];
    // @ts-expect-error 테스트 전용 폴리필 — jsdom은 ResizeObserver를 제공하지 않는다.
    global.ResizeObserver = FakeResizeObserver;
  });

  afterEach(() => {
    // RTL의 afterEach 자동 cleanup은 이 프로젝트의 vitest globals:false
    // 설정에서는 등록되지 않는다(RTL이 확인하는 전역 afterEach가 없다) —
    // 명시적으로 부르지 않으면 이전 테스트에서 렌더된 지도가 마운트된 채
    // 다음 테스트까지 남아(ResizeObserver 구독, navermap_authFailure
    // 리스너 등) 테스트 간 오염을 일으킨다. 이 cleanup은 각 렌더의 effect
    // cleanup(리스너 해제·map.destroy() 등)을 실제로 실행시켜준다.
    cleanup();
    vi.unstubAllEnvs();
    delete window.naver;
    delete window.navermap_authFailure;
    delete window.__onnestNaverMapsSdkPromise;
    // @ts-expect-error 테스트 정리 — 다음 테스트(또는 다음 파일)에 전역 폴리필이 새지 않게 한다.
    delete global.ResizeObserver;
    vi.restoreAllMocks();
  });

  it("SDK가 준비되면 지도를 생성한다", async () => {
    render(
      <InteractivePropertyMap
        markers={[marker()]}
        selectedKey={null}
        onSelectMarker={() => {}}
        active
        fallback={<div>fallback</div>}
        emptyMessage="없음"
      />,
    );

    await waitFor(() => expect(fakeNaver.maps.Map).toHaveBeenCalledTimes(1));
  });

  it("마커를 추가하고, 목록에서 빠지면 setMap(null)로 제거한다", async () => {
    const { rerender } = render(
      <InteractivePropertyMap
        markers={[marker({ key: "a" }), marker({ key: "b", id: "b" })]}
        selectedKey={null}
        onSelectMarker={() => {}}
        active
        fallback={<div>fallback</div>}
        emptyMessage="없음"
      />,
    );

    await waitFor(() => expect(fakeNaver.maps.Marker).toHaveBeenCalledTimes(2));
    const secondMarkerInstance = fakeNaver.maps.Marker.mock.results[1].value as FakeMarker;

    rerender(
      <InteractivePropertyMap
        markers={[marker({ key: "a" })]}
        selectedKey={null}
        onSelectMarker={() => {}}
        active
        fallback={<div>fallback</div>}
        emptyMessage="없음"
      />,
    );

    await waitFor(() => expect(secondMarkerInstance.setMap).toHaveBeenCalledWith(null));
  });

  it("마커 클릭 시 onSelectMarker를 최신 콜백으로 호출한다(재렌더로 콜백이 바뀌어도)", async () => {
    const firstOnSelect = vi.fn();
    const { rerender } = render(
      <InteractivePropertyMap
        markers={[marker()]}
        selectedKey={null}
        onSelectMarker={firstOnSelect}
        active
        fallback={<div>fallback</div>}
        emptyMessage="없음"
      />,
    );
    await waitFor(() => expect(fakeNaver.maps.Marker).toHaveBeenCalledTimes(1));

    const secondOnSelect = vi.fn();
    rerender(
      <InteractivePropertyMap
        markers={[marker()]}
        selectedKey={null}
        onSelectMarker={secondOnSelect}
        active
        fallback={<div>fallback</div>}
        emptyMessage="없음"
      />,
    );

    // 마커를 다시 만들지 않고(같은 key), 리스너도 다시 등록하지 않는다.
    expect(fakeNaver.maps.Marker).toHaveBeenCalledTimes(1);
    expect(fakeNaver.maps.Event.addListener).toHaveBeenCalledTimes(1);

    fakeNaver.maps.Event.trigger(fakeNaver.maps.Marker.mock.results[0].value, "click");

    await waitFor(() => {
      expect(secondOnSelect).toHaveBeenCalledWith("saved:a");
      expect(firstOnSelect).not.toHaveBeenCalled();
    });
  });

  it("아이콘 히트 영역은 선택 여부와 무관하게 44×44(anchor 22×22)이고, 안쪽 시각적 원 크기만 선택 시 커진다", async () => {
    const { rerender } = render(
      <InteractivePropertyMap
        markers={[marker()]}
        selectedKey="saved:a"
        onSelectMarker={() => {}}
        active
        fallback={<div>fallback</div>}
        emptyMessage="없음"
      />,
    );
    await waitFor(() => expect(fakeNaver.maps.Marker).toHaveBeenCalledTimes(1));
    const instance = fakeNaver.maps.Marker.mock.results[0].value as FakeMarker;

    await waitFor(() => {
      expect(instance.icon.size).toEqual({ width: 44, height: 44, kind: "Size" });
      expect(instance.icon.anchor).toEqual({ x: 22, y: 22, kind: "Point" });
      expect(instance.icon.content).toContain("width:34px");
    });

    rerender(
      <InteractivePropertyMap
        markers={[marker()]}
        selectedKey={null}
        onSelectMarker={() => {}}
        active
        fallback={<div>fallback</div>}
        emptyMessage="없음"
      />,
    );

    await waitFor(() => {
      expect(instance.icon.size).toEqual({ width: 44, height: 44, kind: "Size" });
      expect(instance.icon.anchor).toEqual({ x: 22, y: 22, kind: "Point" });
      expect(instance.icon.content).toContain("width:24px");
    });
  });

  it("마커가 1건이면 setCenter/setZoom을 쓴다", async () => {
    render(
      <InteractivePropertyMap
        markers={[marker()]}
        selectedKey={null}
        onSelectMarker={() => {}}
        active
        fallback={<div>fallback</div>}
        emptyMessage="없음"
      />,
    );

    await waitFor(() => expect(fakeNaver.maps.Map).toHaveBeenCalledTimes(1));
    const mapInstance = fakeNaver.maps.Map.mock.results[0].value as FakeMap;
    await waitFor(() => expect(mapInstance.setCenter).toHaveBeenCalledWith({ lat: 37.5, lng: 127.0, kind: "LatLng" }));
    expect(mapInstance.setZoom).toHaveBeenCalledWith(16);
    expect(mapInstance.fitBounds).not.toHaveBeenCalled();
  });

  it("마커가 여러 건이면 fitBounds를 쓴다", async () => {
    render(
      <InteractivePropertyMap
        markers={[marker({ key: "a", lat: 37.5, lng: 127.0 }), marker({ key: "b", id: "b", lat: 35.1, lng: 129.0 })]}
        selectedKey={null}
        onSelectMarker={() => {}}
        active
        fallback={<div>fallback</div>}
        emptyMessage="없음"
      />,
    );

    await waitFor(() => expect(fakeNaver.maps.Map).toHaveBeenCalledTimes(1));
    const mapInstance = fakeNaver.maps.Map.mock.results[0].value as FakeMap;
    await waitFor(() => expect(mapInstance.fitBounds).toHaveBeenCalledTimes(1));
  });

  it("컨테이너 크기 변화(ResizeObserver)가 감지되면 지도를 다시 리사이즈하고 viewport를 재적용한다", async () => {
    render(
      <InteractivePropertyMap
        markers={[marker()]}
        selectedKey={null}
        onSelectMarker={() => {}}
        active
        fallback={<div>fallback</div>}
        emptyMessage="없음"
      />,
    );

    await waitFor(() => expect(fakeNaver.maps.Map).toHaveBeenCalledTimes(1));
    const mapInstance = fakeNaver.maps.Map.mock.results[0].value as FakeMap;
    await waitFor(() => expect(FakeResizeObserver.instances.length).toBe(1));

    mapInstance.autoResize.mockClear();
    mapInstance.setCenter.mockClear();
    FakeResizeObserver.instances[0].trigger();

    await waitFor(() => {
      expect(mapInstance.autoResize).toHaveBeenCalledTimes(1);
      expect(mapInstance.setCenter).toHaveBeenCalledTimes(1);
    });
  });

  it("언마운트하면 마커를 지우고 리스너를 해제한 뒤 map.destroy()를 부른다", async () => {
    const { unmount } = render(
      <InteractivePropertyMap
        markers={[marker()]}
        selectedKey={null}
        onSelectMarker={() => {}}
        active
        fallback={<div>fallback</div>}
        emptyMessage="없음"
      />,
    );

    await waitFor(() => expect(fakeNaver.maps.Marker).toHaveBeenCalledTimes(1));
    const markerInstance = fakeNaver.maps.Marker.mock.results[0].value as FakeMarker;
    const mapInstance = fakeNaver.maps.Map.mock.results[0].value as FakeMap;
    expect(fakeNaver.listeners).toHaveLength(1);

    unmount();

    expect(markerInstance.setMap).toHaveBeenCalledWith(null);
    expect(fakeNaver.listeners).toHaveLength(0);
    expect(mapInstance.destroy).toHaveBeenCalledTimes(1);
  });

  it("스크립트 로딩 후 NCP 인증이 뒤늦게 실패하면(navermap_authFailure) fallback으로 전환하고 옛 지도 인스턴스를 정리한다", async () => {
    render(
      <InteractivePropertyMap
        markers={[marker()]}
        selectedKey={null}
        onSelectMarker={() => {}}
        active
        fallback={<div>지도를 표시할 수 없습니다</div>}
        emptyMessage="없음"
      />,
    );

    await waitFor(() => expect(fakeNaver.maps.Map).toHaveBeenCalledTimes(1));
    const mapInstance = fakeNaver.maps.Map.mock.results[0].value as FakeMap;
    const markerInstance = fakeNaver.maps.Marker.mock.results[0].value as FakeMarker;
    expect(screen.queryByText("지도를 표시할 수 없습니다")).toBeNull();

    // 실제 NCP SDK가 스크립트 로딩 이후 인증 실패 시 부르는 전역 콜백을
    // 흉내낸다(예: 이 Application에 Dynamic Map이 승인돼 있지 않은 경우).
    window.navermap_authFailure?.();

    await waitFor(() => {
      expect(screen.getByText("지도를 표시할 수 없습니다")).not.toBeNull();
    });
    // 폴백으로 전환되면서 옛 지도·마커를 정리해, 나중에 다시 "ready"가
    // 되더라도 죽은 인스턴스가 남지 않게 한다.
    expect(mapInstance.destroy).toHaveBeenCalledTimes(1);
    expect(markerInstance.setMap).toHaveBeenCalledWith(null);
  });

  it("window.navermap_authFailure에 이미 다른 핸들러가 등록돼 있으면 덮어쓰지 않고 이어서 호출한다", async () => {
    const preExistingHandler = vi.fn();
    window.navermap_authFailure = preExistingHandler;

    render(
      <InteractivePropertyMap
        markers={[marker()]}
        selectedKey={null}
        onSelectMarker={() => {}}
        active
        fallback={<div>지도를 표시할 수 없습니다</div>}
        emptyMessage="없음"
      />,
    );
    await waitFor(() => expect(fakeNaver.maps.Map).toHaveBeenCalledTimes(1));

    window.navermap_authFailure?.();

    // 우리 쪽 구독자(폴백 전환)도 여전히 동작하고,
    await waitFor(() => {
      expect(screen.getByText("지도를 표시할 수 없습니다")).not.toBeNull();
    });
    // 렌더 전에 이미 있던 핸들러도 그대로 불린다(우리가 덮어써서 사라지지 않는다).
    expect(preExistingHandler).toHaveBeenCalledTimes(1);
  });

  it("좌표가 없으면(마커 0건) SDK를 불러오지 않고 안내 문구만 보여준다", () => {
    render(
      <InteractivePropertyMap
        markers={[]}
        selectedKey={null}
        onSelectMarker={() => {}}
        active
        fallback={<div>fallback</div>}
        emptyMessage="표시할 위치 정보가 있는 매물이 없습니다."
      />,
    );

    expect(screen.getByText("표시할 위치 정보가 있는 매물이 없습니다.")).not.toBeNull();
    expect(fakeNaver.maps.Map).not.toHaveBeenCalled();
  });
});

describe("triggerMapResize (SDK 메서드 이름 대응 순서)", () => {
  it("autoResize가 있으면 그것만 부른다", () => {
    const map = { autoResize: vi.fn(), setSize: vi.fn() };
    const naver = { maps: { Event: { trigger: vi.fn() } } };
    triggerMapResize(naver, map, document.createElement("div"));
    expect(map.autoResize).toHaveBeenCalledTimes(1);
    expect(map.setSize).not.toHaveBeenCalled();
    expect(naver.maps.Event.trigger).not.toHaveBeenCalled();
  });

  it("autoResize가 없고 setSize가 있으면 컨테이너 크기로 setSize를 부른다", () => {
    const map = { setSize: vi.fn() };
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 400 });
    Object.defineProperty(container, "clientHeight", { value: 300 });
    const sizeCtor = vi.fn(function (width: number, height: number) {
      return { width, height };
    });
    const naver = { maps: { Size: sizeCtor, Event: { trigger: vi.fn() } } };

    triggerMapResize(naver, map, container);

    expect(sizeCtor).toHaveBeenCalledWith(400, 300);
    expect(map.setSize).toHaveBeenCalledWith({ width: 400, height: 300 });
    expect(naver.maps.Event.trigger).not.toHaveBeenCalled();
  });

  it("둘 다 없으면 Event.trigger(map, 'resize')로 대체한다", () => {
    const map = {};
    const naver = { maps: { Event: { trigger: vi.fn() } } };
    triggerMapResize(naver, map, document.createElement("div"));
    expect(naver.maps.Event.trigger).toHaveBeenCalledWith(map, "resize");
  });

  it("비정상 SDK 객체가 예외를 던져도 앱을 죽이지 않는다", () => {
    const map = {
      autoResize: () => {
        throw new Error("broken sdk");
      },
    };
    expect(() => triggerMapResize({ maps: {} }, map, document.createElement("div"))).not.toThrow();
  });
});
