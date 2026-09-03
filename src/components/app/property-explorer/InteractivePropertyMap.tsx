"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { computeMapViewport, type PropertyMapMarkerData } from "@/lib/propertyExplorer";
import { useNaverMapsSdk, type NaverMapsSdkStatus } from "./NaverMapLoader";
import { buildMarkerIconSpec } from "./mapMarkerContent";
import { cn } from "@/lib/cn";

const DEFAULT_SINGLE_ZOOM = 16;

// naver.maps 네임스페이스는 공식 @types 패키지가 없어 여기서만 좁게 any를
// 쓴다(eslint 규칙상 경고로만 처리됨) — 이 파일 밖으로는 타입이 새지 않는다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NaverMapsNamespace = any;

type MarkerEntry = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listener: any;
};

/**
 * 마커 하나를 지도에서 뗀다. 실제 SDK는 인증이 실패해 내부 상태가 깨진
 * 지도에 붙은 마커를 setMap(null)하면 SDK 내부 코드에서 예외를 던질 수
 * 있다(실제로 NCP 인증 실패 상황에서 재현됨 — Marker.setMap이 지도의
 * 내부 프로퍼티를 읽다 null 참조로 죽는 경우가 있었다). 여기서 예외를
 * 삼키지 않으면 React 커밋 중 오류가 나 화면 전체가 에러 바운더리로
 * 넘어가버린다 — 지도 정리 실패가 페이지 전체를 죽이면 안 된다.
 */
function safeRemoveMarker(naver: NaverMapsNamespace, entry: MarkerEntry) {
  try {
    entry.instance.setMap(null);
  } catch (error) {
    console.error("[naver-map] failed to detach marker from map", error);
  }
  try {
    if (naver?.maps?.Event && entry.listener) naver.maps.Event.removeListener(entry.listener);
  } catch (error) {
    console.error("[naver-map] failed to remove marker listener", error);
  }
}

function toNaverIcon(naver: NaverMapsNamespace, title: string, selected: boolean) {
  const spec = buildMarkerIconSpec(title, selected);
  return {
    content: spec.content,
    size: new naver.maps.Size(spec.width, spec.height),
    anchor: new naver.maps.Point(spec.anchorX, spec.anchorY),
  };
}

/** 마커 좌표 기준으로 지도 중심·확대 수준을 다시 맞춘다. 0건이면 아무것도 하지 않는다(이전 마커는 diff 단계에서 이미 지워진 상태). */
function reapplyViewport(naver: NaverMapsNamespace, map: NaverMapsNamespace, markers: PropertyMapMarkerData[]) {
  const viewport = computeMapViewport(markers.map((m) => ({ lat: m.lat, lng: m.lng })));
  if (viewport.kind === "empty") return;
  if (viewport.kind === "single") {
    map.setCenter(new naver.maps.LatLng(viewport.center.lat, viewport.center.lng));
    map.setZoom(DEFAULT_SINGLE_ZOOM);
    return;
  }
  map.fitBounds(
    new naver.maps.LatLngBounds(
      new naver.maps.LatLng(viewport.sw.lat, viewport.sw.lng),
      new naver.maps.LatLng(viewport.ne.lat, viewport.ne.lng),
    ),
  );
}

/**
 * 컨테이너 크기가 바뀐 뒤(모바일 목록↔지도 재진입, 화면 회전, 1024px
 * 브레이크포인트 전환 등) 지도에 새 크기를 알린다. 공식 메서드 이름이
 * SDK 버전에 따라 다를 수 있어 존재하는 것부터 순서대로 시도하고, 셋 다
 * 없거나 호출 중 예외가 나도(비정상 SDK 객체) 앱이 죽지 않게 삼킨다.
 */
export function triggerMapResize(naver: NaverMapsNamespace, map: NaverMapsNamespace, container: HTMLElement) {
  try {
    if (typeof map.autoResize === "function") {
      map.autoResize();
      return;
    }
    if (typeof map.setSize === "function" && naver?.maps?.Size) {
      map.setSize(new naver.maps.Size(container.clientWidth, container.clientHeight));
      return;
    }
    if (naver?.maps?.Event?.trigger) {
      naver.maps.Event.trigger(map, "resize");
    }
  } catch (error) {
    console.error("[naver-map] failed to resize map", error);
  }
}

/**
 * 매물 탐색 화면 전용 인터랙티브 다중 마커 지도. 공식 네이버 지도 Dynamic
 * Map JS SDK만 쓰고, `active`가 true일 때만(=이 패널이 실제로 보일 때만)
 * 지연 로딩한다. SDK 미설정·로딩 실패·좌표 0건일 때는 지도를 그리지 않고
 * `fallback`/`emptyMessage`로 대체한다 — 지도 실패가 매물 목록 자체를
 * 막지 않는다.
 */
export function InteractivePropertyMap({
  markers,
  selectedKey,
  onSelectMarker,
  active,
  fallback,
  emptyMessage,
  className,
  onStatusChange,
}: {
  markers: PropertyMapMarkerData[];
  selectedKey: string | null;
  onSelectMarker: (key: string) => void;
  /** 이 패널이 지금 실제로 보이는 상태인지 — SDK 지연 로딩을 트리거하는 조건. */
  active: boolean;
  /** SDK 미설정·로딩 실패 시 대신 보여줄 내용(예: 기존 StaticPropertyMap 또는 주소 목록). */
  fallback: ReactNode;
  /** 마커가 0건일 때 지도 대신 보여줄 안내문. */
  emptyMessage: string;
  className?: string;
  /** 부모(PropertyExplorer)가 모바일 첫 화면 폴백 여부를 판단할 수 있도록 SDK 상태를 알려준다. */
  onStatusChange?: (status: NaverMapsSdkStatus) => void;
}) {
  const hasMarkers = markers.length > 0;
  // 표시할 마커가 아예 없으면 SDK를 불러올 이유도 없다 — "지도 화면에서만
  // 지연 로딩"을 더 엄격히 지킨다.
  const status = useNaverMapsSdk(active && hasMarkers);

  useEffect(() => {
    onStatusChange?.(status);
    // onStatusChange는 부모가 렌더마다 새로 만들 수 있는 콜백이다 — 상태가
    // 실제로 바뀔 때만 알리면 충분하므로 deps에는 status만 둔다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMapsNamespace | null>(null);
  const markerEntriesRef = useRef<Map<string, MarkerEntry>>(new Map());
  const selectedKeyRef = useRef<string | null>(selectedKey);

  // 마커·리사이즈 핸들러가 항상 "가장 최신" 값을 읽도록 ref로 미러링한다.
  // 마커 자체(naver.maps.Marker 인스턴스)와 리스너는 이 값이 바뀔 때마다
  // 다시 만들지 않는다 — 리스너는 한 번만 등록하고 항상 최신 콜백/좌표를
  // ref를 통해 읽게 해, 재렌더가 잦아도 리스너 등록·해제가 반복되지 않는다.
  const markersRef = useRef(markers);
  const onSelectMarkerRef = useRef(onSelectMarker);
  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);
  useEffect(() => {
    onSelectMarkerRef.current = onSelectMarker;
  }, [onSelectMarker]);

  // 지도 인스턴스 생성(한 번만) — SDK가 준비되고 컨테이너가 실제로 DOM에
  // 있을 때만 만든다.
  useEffect(() => {
    if (status !== "ready" || !containerRef.current || mapRef.current) return;
    const naver = window.naver;
    if (!naver?.maps) return;
    mapRef.current = new naver.maps.Map(containerRef.current, {
      center: new naver.maps.LatLng(36.5, 127.8), // 대한민국 대략 중심 — 마커가 생기면 즉시 재조정된다.
      zoom: 7,
    });
  }, [status]);

  // 마커 제거 → 리스너 해제 → 지도 인스턴스 정리 순서로 마무리한다.
  // destroy가 없는 SDK 객체(비정상·구버전 등)에서도 예외 없이 넘어간다.
  // deps를 status로 둔다 — 컴포넌트가 사라질 때뿐 아니라, 한 번 "ready"였던
  // 지도가 나중에(예: NCP 인증이 뒤늦게 실패해 navermap_authFailure로
  // "error"가 되는 경우) "ready"가 아니게 될 때도 정리해야 한다. 그렇지
  // 않으면 폴백 UI로 넘어가 컨테이너 div가 사라진 뒤에도 옛 지도·마커
  // 인스턴스가 참조로 남아, 나중에 다시 "ready"가 됐을 때 새로 만들지
  // 않고 죽은 인스턴스를 그대로 두게 된다.
  useEffect(() => {
    const markerEntries = markerEntriesRef.current;
    return () => {
      const naver = window.naver;
      for (const entry of markerEntries.values()) {
        safeRemoveMarker(naver, entry);
      }
      markerEntries.clear();

      const map = mapRef.current;
      if (map && typeof map.destroy === "function") {
        try {
          map.destroy();
        } catch (error) {
          console.error("[naver-map] failed to destroy map", error);
        }
      }
      mapRef.current = null;
    };
  }, [status]);

  // 마커 목록이 바뀔 때마다 diff한다 — 사라진 항목만 지우고, 새로 생긴
  // 항목만 만든다(검색·필터가 바뀔 때마다 전체를 지웠다 새로 만들지 않는다).
  // 클릭 리스너는 marker.key만 캡처하고 실제 콜백은 항상 onSelectMarkerRef를
  // 통해 최신 값을 부르므로, 부모가 렌더마다 새 함수를 넘겨도 리스너를
  // 다시 붙이지 않는다.
  useEffect(() => {
    const naver = window.naver;
    const map = mapRef.current;
    if (status !== "ready" || !naver?.maps || !map) return;

    const nextKeys = new Set(markers.map((m) => m.key));
    for (const [key, entry] of markerEntriesRef.current) {
      if (!nextKeys.has(key)) {
        safeRemoveMarker(naver, entry);
        markerEntriesRef.current.delete(key);
      }
    }

    for (const marker of markers) {
      const existing = markerEntriesRef.current.get(marker.key);
      const selected = marker.key === selectedKeyRef.current;
      const icon = toNaverIcon(naver, marker.title, selected);
      if (existing) {
        existing.instance.setIcon(icon);
        existing.instance.setPosition(new naver.maps.LatLng(marker.lat, marker.lng));
        continue;
      }
      const instance = new naver.maps.Marker({
        position: new naver.maps.LatLng(marker.lat, marker.lng),
        map,
        icon,
      });
      const listener = naver.maps.Event.addListener(instance, "click", () => onSelectMarkerRef.current(marker.key));
      markerEntriesRef.current.set(marker.key, { instance, listener });
    }
  }, [markers, status]);

  // 선택 상태가 바뀌면: (1) 이전/새 마커 아이콘을 갱신하고 (2) 새 마커로
  // 지도 중심을 이동한다(목록 카드 클릭 → 마커로 이동 요구사항).
  useEffect(() => {
    selectedKeyRef.current = selectedKey;
    const naver = window.naver;
    const map = mapRef.current;
    if (status !== "ready" || !naver?.maps || !map) return;

    for (const [key, entry] of markerEntriesRef.current) {
      const marker = markers.find((m) => m.key === key);
      if (!marker) continue;
      entry.instance.setIcon(toNaverIcon(naver, marker.title, key === selectedKey));
    }

    if (selectedKey) {
      const selectedMarker = markers.find((m) => m.key === selectedKey);
      if (selectedMarker) {
        const latLng = new naver.maps.LatLng(selectedMarker.lat, selectedMarker.lng);
        if (typeof map.panTo === "function") map.panTo(latLng);
        else map.setCenter(latLng);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, status]);

  // 마커 집합이 바뀌면(검색·필터 결과 변경) bounds를 다시 맞춘다.
  useEffect(() => {
    const naver = window.naver;
    const map = mapRef.current;
    if (status !== "ready" || !naver?.maps || !map) return;
    reapplyViewport(naver, map, markers);
  }, [markers, status]);

  // 컨테이너 크기 변화 대응: ResizeObserver로 실제 픽셀 크기 변화를
  // 감지하고(모바일 목록→지도 재진입, 1024px 브레이크포인트 전환 등 —
  // display:none↔block 전환도 크기가 0→실제값으로 바뀌므로 감지된다),
  // 화면 회전도 별도로 듣는다. jsdom 등 ResizeObserver가 없는 환경에서도
  // 예외 없이 넘어간다.
  useEffect(() => {
    const naver = window.naver;
    const map = mapRef.current;
    const container = containerRef.current;
    if (status !== "ready" || !naver?.maps || !map || !container) return;

    function handleResize() {
      if (!naver?.maps || !map || !container) return;
      triggerMapResize(naver, map, container);
      reapplyViewport(naver, map, markersRef.current);
    }

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(handleResize);
      observer.observe(container);
    }
    window.addEventListener("orientationchange", handleResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [status]);

  // active가 false→true로 바뀐 직후(예: 모바일에서 "지도 보기"를 다시
  // 누름) 컨테이너가 막 보이기 시작한 시점이라 아직 레이아웃이 확정되지
  // 않았을 수 있다 — 한 프레임 기다린 뒤 크기를 다시 재보고 지도에 알린다.
  const wasActiveRef = useRef(active);
  useEffect(() => {
    const wasActive = wasActiveRef.current;
    wasActiveRef.current = active;
    if (wasActive || !active || status !== "ready") return;

    const naver = window.naver;
    const map = mapRef.current;
    const container = containerRef.current;
    if (!naver?.maps || !map || !container) return;

    const rafId = requestAnimationFrame(() => {
      triggerMapResize(naver, map, container);
      reapplyViewport(naver, map, markersRef.current);
    });
    return () => cancelAnimationFrame(rafId);
  }, [active, status]);

  if (!hasMarkers) {
    return (
      <div className={cn("flex items-center justify-center bg-cream/60 p-6 text-center text-sm text-ink/55", className)}>
        {emptyMessage}
      </div>
    );
  }

  if (status === "unconfigured" || status === "error") {
    // fallback도 지도와 같은 className(높이 지정)을 받아야 한다 — 안 그러면
    // 지도가 실패할 때마다 카드가 콘텐츠 높이로 붕괴해 옆 목록·요약 카드가
    // 크게 흔들리고, "지도 화면"이라는 인상이 약해진다.
    return <div className={cn("min-w-0 flex flex-col justify-center", className)}>{fallback}</div>;
  }

  return (
    <div className="relative min-w-0">
      <div ref={containerRef} className={cn("min-w-0", className)} />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-cream/60 text-sm text-ink/55">
          지도를 불러오는 중입니다…
        </div>
      )}
    </div>
  );
}
