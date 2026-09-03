import { describe, expect, it } from "vitest";
import { buildMarkerHtml, buildMarkerIconSpec, getMarkerDimension, HIT_AREA, MARKER_SIZE } from "./mapMarkerContent";

describe("buildMarkerHtml", () => {
  it("매물명을 role=img·aria-label·title에 반영한다", () => {
    const html = buildMarkerHtml("역삼동 24평", false);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="역삼동 24평"');
    expect(html).toContain('title="역삼동 24평"');
  });

  it("선택 상태면 aria-label에 (선택됨)이 붙고 크기·테두리가 커진다(색상에만 의존하지 않는다)", () => {
    const selected = buildMarkerHtml("역삼동 24평", true);
    const unselected = buildMarkerHtml("역삼동 24평", false);
    expect(selected).toContain("(선택됨)");
    expect(selected).toContain(`width:${MARKER_SIZE.selected}px`);
    expect(unselected).toContain(`width:${MARKER_SIZE.default}px`);
    expect(selected).not.toBe(unselected);
  });

  it("매물명에 포함된 HTML 특수문자를 이스케이프한다(마커 콘텐츠는 innerHTML로 꽂힌다)", () => {
    const html = buildMarkerHtml('<script>alert("xss")</script>', false);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;xss&quot;");
  });

  it("따옴표가 포함된 매물명도 안전하게 속성값 안에 들어간다", () => {
    const html = buildMarkerHtml(`매물"이름'테스트`, false);
    expect(html).toContain("&quot;");
    expect(html).toContain("&#39;");
    expect(html).not.toContain(`매물"이름`);
  });
});

describe("getMarkerDimension", () => {
  it("선택 여부에 따라 MARKER_SIZE.default/selected를 그대로 돌려준다", () => {
    expect(getMarkerDimension(false)).toBe(MARKER_SIZE.default);
    expect(getMarkerDimension(true)).toBe(MARKER_SIZE.selected);
  });
});

describe("buildMarkerIconSpec", () => {
  it("선택 여부와 무관하게 히트 영역은 항상 44×44, anchor=22×22이다(터치 타깃은 시각적 크기와 분리)", () => {
    for (const selected of [true, false]) {
      const spec = buildMarkerIconSpec("역삼동 24평", selected);
      expect(spec.width).toBe(HIT_AREA);
      expect(spec.height).toBe(HIT_AREA);
      expect(spec.anchorX).toBe(HIT_AREA / 2);
      expect(spec.anchorY).toBe(HIT_AREA / 2);
    }
  });

  it("히트 영역은 고정이어도 안쪽 시각적 원 크기는 선택 여부에 따라 여전히 달라진다", () => {
    const selected = buildMarkerIconSpec("역삼동 24평", true);
    const unselected = buildMarkerIconSpec("역삼동 24평", false);
    expect(selected.content).toContain(`width:${MARKER_SIZE.selected}px`);
    expect(unselected.content).toContain(`width:${MARKER_SIZE.default}px`);
  });

  it("content는 buildMarkerHtml과 같은 결과를 담는다(size/anchor와 HTML이 서로 다른 값에서 파생되지 않는다)", () => {
    const spec = buildMarkerIconSpec("역삼동 24평", true);
    expect(spec.content).toBe(buildMarkerHtml("역삼동 24평", true));
  });

  it("anchor는 항상 width/height의 정확히 절반이다(선택 상태와 무관하게)", () => {
    for (const selected of [true, false]) {
      const spec = buildMarkerIconSpec("아무 매물", selected);
      expect(spec.anchorX).toBe(spec.width / 2);
      expect(spec.anchorY).toBe(spec.height / 2);
    }
  });
});
