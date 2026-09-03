/**
 * 네이버 지도 마커에 커스텀 HTML을 넣을 때 쓰는 내용을 만든다. SDK의
 * icon.content는 그대로 innerHTML로 꽂히므로, 매물명처럼 사용자가 입력한
 * 텍스트를 반드시 이스케이프한 뒤 넣는다(그렇지 않으면 매물명에 HTML을
 * 넣어 마커 렌더링을 통해 스크립트를 주입할 수 있다).
 *
 * role="img"+aria-label로 매물명 기반 접근 가능한 이름을 준다 — 공식 SDK가
 * Marker 자체에 title/aria-label 옵션을 제공하지는 않지만, 커스텀 HTML
 * 콘텐츠 마커(icon.content)에는 임의의 속성을 넣을 수 있어 이 범위 안에서
 * 가능하다.
 *
 * 선택 여부는 크기·테두리 두께로도 구분한다(색상에만 의존하지 않는다).
 */
function escapeForMarkerHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]!);
}

export const MARKER_SIZE = { default: 24, selected: 34 } as const;

/**
 * 실제 클릭·탭 가능한 영역(px, 정사각형). 시각적으로 보이는 원 크기(MARKER_SIZE)와는
 * 별개다 — 기본 마커(24px)는 손가락으로 누르기엔 너무 작아, 눈에 보이는 크기는
 * 그대로 두고 히트 영역만 44px(모바일 터치 타깃 권장 최소 크기)로 키운다.
 * SDK icon.size·icon.anchor는 이 값 하나에서만 나온다(선택 여부와 무관하게 항상
 * 44×44, anchor 22×22) — 그래야 마커가 실제 좌표에서 시각적으로 벗어나 보이지 않는다.
 */
export const HIT_AREA = 44;

/** 선택 여부에 따른 마커 "시각적" 한 변의 길이(px) — HTML 안쪽 원의 크기에만 쓰인다. */
export function getMarkerDimension(selected: boolean): number {
  return selected ? MARKER_SIZE.selected : MARKER_SIZE.default;
}

export function buildMarkerHtml(title: string, selected: boolean): string {
  const safeTitle = escapeForMarkerHtml(title);
  const label = selected ? `${safeTitle}(선택됨)` : safeTitle;
  const size = getMarkerDimension(selected);
  const background = selected ? "#1f6b4c" : "#2f8f5b";
  const border = selected ? "3px solid #ffffff" : "2px solid #ffffff";
  const boxShadow = selected ? "0 0 0 3px rgba(31,107,76,0.55)" : "0 1px 3px rgba(0,0,0,0.35)";
  return (
    `<div role="img" aria-label="${label}" title="${safeTitle}" ` +
    `style="width:${HIT_AREA}px;height:${HIT_AREA}px;display:flex;align-items:center;justify-content:center;cursor:pointer;">` +
    `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${background};` +
    `border:${border};box-shadow:${boxShadow};"></div>` +
    `</div>`
  );
}

export type MarkerIconSpec = {
  content: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
};

/**
 * 마커 아이콘에 필요한 값을 전부 한 번에 계산한다 — HTML 콘텐츠·크기·anchor를
 * 따로따로 계산하면(예: 콘텐츠만 선택 크기로 바꾸고 size/anchor는 그대로
 * 두면) 마커가 커진 만큼 anchor가 어긋나 실제 좌표에서 벗어나 보이는
 * 버그가 생긴다. 선택 마커가 34px이면 반드시 size=34×34, anchor=17×17이어야
 * 한다(중앙 정렬 기준점).
 */
export function buildMarkerIconSpec(title: string, selected: boolean): MarkerIconSpec {
  return {
    content: buildMarkerHtml(title, selected),
    width: HIT_AREA,
    height: HIT_AREA,
    anchorX: HIT_AREA / 2,
    anchorY: HIT_AREA / 2,
  };
}
