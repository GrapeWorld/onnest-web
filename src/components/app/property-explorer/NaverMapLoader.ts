"use client";

import { useEffect, useState } from "react";

/**
 * 네이버 지도 Dynamic Map JS SDK 로딩 상태.
 * - unconfigured: NEXT_PUBLIC_NCP_MAP_CLIENT_ID가 설정돼 있지 않다(정지 지도로 폴백).
 * - error: 스크립트 로딩 자체가 실패했거나(window.naver.maps 없음), 스크립트는
 *   받아왔지만 NCP 쪽 인증이 실패한 경우(Dynamic Map API 미승인, 도메인
 *   미등록 등 — window.navermap_authFailure로 나중에 통보된다)도 포함한다.
 */
export type NaverMapsSdkStatus = "idle" | "unconfigured" | "loading" | "ready" | "error";

declare global {
  interface Window {
    // 공식 @types 패키지가 없어 여기서는 존재 여부만 확인한다 — 실제 사용하는
    // 메서드 형태는 PropertyMapMarker.ts의 NaverMapsSdk 타입이 좁혀서 쓴다.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 네이버 지도 SDK 전역 객체
    naver?: { maps: any };
    __onnestNaverMapsSdkPromise?: Promise<void>;
    // 네이버 지도 JS API v3 공식 훅 — 스크립트 로딩 자체는 성공했지만 NCP
    // 쪽 인증이 실패하면(Application에 Dynamic Map이 꺼져 있거나, 이
    // 도메인이 Web 서비스 URL로 등록돼 있지 않은 경우 등) SDK가 이 전역
    // 함수를 호출해 알려준다. 스크립트 로딩보다 늦게, 지도를 실제로 쓰려는
    // 시점에 비동기로 오므로 별도 이벤트로 다뤄야 한다. 소유권 정책:
    // 이 저장소에서는 NaverMapLoader.ts만 이 전역을 설정한다(다른 곳
    // 없음, grep으로 확인됨) — 하지만 배타적 소유를 전제하지 않고,
    // 아래 ensureAuthFailureHandlerRegistered가 기존에 등록된 핸들러가
    // 있으면 덮어쓰지 않고 체이닝한다.
    navermap_authFailure?: () => void;
  }
}

const authFailureListeners = new Set<() => void>();
// window.navermap_authFailure가 "우리 자신이 심어둔 디스패처"인지 식별하는
// 참조 — 값 자체가 아니라 이 변수와의 항등 비교로만 판단한다(테스트에서
// window.navermap_authFailure를 지웠다가 다시 렌더하는 식으로 window가
// 재설정돼도 항상 다시 정확히 감지해 재설치할 수 있게).
let ourDispatcher: (() => void) | undefined;

/**
 * window.navermap_authFailure를 등록한다. 이 앱은 이 전역을 이 모듈
 * 하나에서만 쓰지만(다른 곳에서 정의하는 곳 없음, 확인됨), 이 컴포넌트가
 * 나중에 다른 페이지에 임베드되거나 다른 스크립트가 같은 이름을 먼저
 * 등록해 둘 가능성까지 배제할 수 없다 — 그래서 "이미 있으면 무시"가
 * 아니라, 우리 디스패처가 아직 설치돼 있지 않을 때만 그 시점의 기존
 * 핸들러(있다면)를 감싸 우리 구독자 다음에 이어 부르도록 새로 심는다.
 */
function ensureAuthFailureHandlerRegistered() {
  if (typeof window === "undefined" || (ourDispatcher && window.navermap_authFailure === ourDispatcher)) return;
  const previousHandler = window.navermap_authFailure;
  ourDispatcher = () => {
    for (const listener of authFailureListeners) listener();
    previousHandler?.();
  };
  window.navermap_authFailure = ourDispatcher;
}

const SDK_SRC_BASE = "https://oapi.map.naver.com/openapi/v3/maps.js";

/**
 * 브라우저에 노출돼도 되는 지도 전용 공개 Client ID만 읽는다 — 서버 전용
 * NCP_MAP_CLIENT_SECRET은 이 파일(클라이언트 번들)에 절대 들어오지 않는다.
 * NCP 콘솔에서 이 Application에 Dynamic Map이 켜져 있고, 이 값을 쓰는
 * 도메인이 Web 서비스 URL로 등록돼 있어야 실제로 지도가 뜬다(도메인
 * 허용 목록이 실질적인 보안 경계다 — Client ID 자체는 비밀값이 아니다).
 */
function getPublicClientId(): string | null {
  const id = process.env.NEXT_PUBLIC_NCP_MAP_CLIENT_ID;
  return id && id.trim() ? id.trim() : null;
}

export function isInteractiveMapConfigured(): boolean {
  return getPublicClientId() !== null;
}

/**
 * SDK <script> 태그를 최대 한 번만 삽입한다. 여러 InteractivePropertyMap
 * 인스턴스가 거의 동시에 마운트돼도(예: 목록↔지도 전환을 빠르게 반복) 같은
 * 진행 중인 Promise를 공유해 중복 로딩을 막는다.
 */
function loadNaverMapsSdk(clientId: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  ensureAuthFailureHandlerRegistered();
  if (window.naver?.maps) return Promise.resolve();
  if (window.__onnestNaverMapsSdkPromise) return window.__onnestNaverMapsSdkPromise;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${SDK_SRC_BASE}?ncpKeyId=${encodeURIComponent(clientId)}`;
    script.async = true;
    script.onload = () => {
      if (window.naver?.maps) resolve();
      else reject(new Error("naver maps sdk script loaded but window.naver.maps is missing"));
    };
    script.onerror = () => reject(new Error("failed to load naver maps sdk script"));
    document.head.appendChild(script);
  });

  window.__onnestNaverMapsSdkPromise = promise;
  // 실패하면 캐시를 지워, 다음에 이 화면에 다시 들어왔을 때(새로고침 등)
  // 다시 시도할 수 있게 한다 — 실패한 Promise를 영구히 캐시해두지 않는다.
  promise.catch(() => {
    if (window.__onnestNaverMapsSdkPromise === promise) {
      window.__onnestNaverMapsSdkPromise = undefined;
    }
  });
  return promise;
}

/**
 * `shouldLoad`가 true가 될 때만 SDK를 지연 로딩한다 — 지도 화면이 실제로
 * 보이기 전까지는 외부 스크립트를 받아오지 않는다. Client ID가 설정돼
 * 있지 않으면 네트워크 요청 자체를 시도하지 않고 곧바로 "unconfigured"를
 * 돌려준다(정지 지도·주소 목록 폴백으로 이어진다).
 */
export function useNaverMapsSdk(shouldLoad: boolean): NaverMapsSdkStatus {
  // clientId 유무는 렌더링 중에 바로 알 수 있는 값이라 effect 안에서
  // setState로 옮기지 않는다("unconfigured"는 파생값일 뿐, 구독이 필요한
  // 외부 상태가 아니다) — react-hooks/set-state-in-effect가 이런 동기
  // setState를 금지한다. 같은 이유로 "loading"도 별도 setState 없이
  // 파생한다 — asyncStatus가 아직 "idle"이면(=아직 완료 콜백을 못 받았으면)
  // 그 자체가 "loading" 상태다. effect 안에서는 완료(ready/error) 시점에만,
  // 그것도 항상 프로미스 콜백 안에서만 setState한다.
  const clientId = getPublicClientId();
  const [asyncStatus, setAsyncStatus] = useState<"idle" | "ready" | "error">("idle");

  useEffect(() => {
    if (!shouldLoad || !clientId) return;

    let cancelled = false;
    // 스크립트 로딩 자체는 성공해도, 실제로 지도를 쓰려는 시점에 NCP
    // 인증이 뒤늦게 실패할 수 있다(Dynamic Map 미승인 등) — 이미 "ready"
    // 상태로 넘어간 뒤에도 계속 구독해서 그 시점에 "error"로 되돌린다.
    const onAuthFailure = () => {
      if (!cancelled) setAsyncStatus("error");
    };
    authFailureListeners.add(onAuthFailure);

    loadNaverMapsSdk(clientId)
      .then(() => {
        if (!cancelled) setAsyncStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setAsyncStatus("error");
      });

    return () => {
      cancelled = true;
      authFailureListeners.delete(onAuthFailure);
    };
  }, [shouldLoad, clientId]);

  if (!shouldLoad) return "idle";
  if (!clientId) return "unconfigured";
  if (asyncStatus === "idle") return "loading";
  return asyncStatus;
}
