import { expect } from "./test-base";
import type { Page } from "./test-base";

export type Violation = {
  width: number;
  kind: string;
  detail: string;
};

/**
 * 한 페이지 안에서 in-browser로 실행되는 체크. 매 width 단계마다 새로
 * 페이지를 이동하지 않고 뷰포트만 리사이즈해 빠르게 반복한다.
 * - 페이지 전체 가로 오버플로
 * - 뷰포트 밖으로 나간(왼쪽 음수/오른쪽 초과) 보이는 콘텐츠·컨트롤
 * - 헤더의 상호작용 요소들끼리 겹치는지
 */
async function collectViolations(page: Page, width: number): Promise<Violation[]> {
  return page.evaluate((w) => {
    const out: { kind: string; detail: string }[] = [];
    const doc = document.documentElement;

    if (doc.scrollWidth > doc.clientWidth + 1) {
      out.push({
        kind: "page-overflow",
        detail: `scrollWidth(${doc.scrollWidth}) > clientWidth(${doc.clientWidth})`,
      });
    }

    // 실제 눈에 보이는 콘텐츠·컨트롤만 본다 — 구조용 wrapper div까지 다 검사하면
    // 의도된 음수 마진/오버레이 장식(absolute 배경 등)까지 오탐으로 잡힌다.
    const selector =
      "main input, main select, main textarea, main button, main a, " +
      "main p, main span, main h1, main h2, main h3, main h4, main label, " +
      "header input, header button, header a";
    const nodes = Array.from(document.querySelectorAll(selector));
    for (const el of nodes) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      // aria-hidden 장식용(아이콘 등)은 제외한다.
      if (el.getAttribute("aria-hidden") === "true") continue;

      if (rect.right > w + 2) {
        out.push({
          kind: "right-overflow",
          detail: `<${el.tagName.toLowerCase()} class="${(el as HTMLElement).className.toString().slice(0, 80)}"> right=${Math.round(rect.right)} > width=${w}, text="${(el.textContent ?? "").trim().slice(0, 30)}"`,
        });
      }
      if (rect.left < -2) {
        out.push({
          kind: "left-overflow",
          detail: `<${el.tagName.toLowerCase()} class="${(el as HTMLElement).className.toString().slice(0, 80)}"> left=${Math.round(rect.left)} < 0, text="${(el.textContent ?? "").trim().slice(0, 30)}"`,
        });
      }
    }

    // 헤더의 상호작용 가능한 요소들이 서로 겹치지 않는지 확인한다.
    const headerControls = Array.from(
      document.querySelectorAll("header a, header button"),
    ).filter((el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    });
    for (let i = 0; i < headerControls.length; i++) {
      for (let j = i + 1; j < headerControls.length; j++) {
        const a = headerControls[i].getBoundingClientRect();
        const b = headerControls[j].getBoundingClientRect();
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapX > 2 && overlapY > 2) {
          out.push({
            kind: "header-overlap",
            detail: `헤더 요소 겹침: "${(headerControls[i].textContent ?? "").trim().slice(0, 20)}" ↔ "${(headerControls[j].textContent ?? "").trim().slice(0, 20)}"`,
          });
        }
      }
    }

    return out;
  }, width) as unknown as Violation[];
}

/**
 * 이미 페이지가 로드된 `page`를 minWidth~maxWidth 구간에서 step 간격으로
 * 리사이즈하며 레이아웃 붕괴를 검사한다. 실패 시 어떤 width에서 어떤
 * 요소가 문제였는지 한 번에 보여준다.
 */
export async function sweepWidths(
  page: Page,
  {
    minWidth = 320,
    maxWidth = 1366,
    step = 20,
    height = 900,
  }: { minWidth?: number; maxWidth?: number; step?: number; height?: number } = {},
) {
  const allViolations: Violation[] = [];
  for (let width = minWidth; width <= maxWidth; width += step) {
    await page.setViewportSize({ width, height });
    const violations = await collectViolations(page, width);
    for (const v of violations) allViolations.push({ ...v, width });
  }
  // 마지막 경계값(maxWidth)을 정확히 한 번 더 포함시킨다(step이 정확히 안 맞아떨어질 때 대비).
  if ((maxWidth - minWidth) % step !== 0) {
    await page.setViewportSize({ width: maxWidth, height });
    const violations = await collectViolations(page, maxWidth);
    for (const v of violations) allViolations.push({ ...v, width: maxWidth });
  }

  if (allViolations.length > 0) {
    const summary = allViolations
      .slice(0, 20)
      .map((v) => `  [${v.width}px] ${v.kind}: ${v.detail}`)
      .join("\n");
    expect(
      allViolations.length,
      `${allViolations.length}건의 레이아웃 붕괴 발견 (최대 20건 표시):\n${summary}`,
    ).toBe(0);
  }
}

/** 특정 width 목록에서만 검사한다 (breakpoint 경계값처럼 이산적인 지점들). */
export async function checkWidths(page: Page, widths: number[], height = 900) {
  const allViolations: Violation[] = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height });
    const violations = await collectViolations(page, width);
    for (const v of violations) allViolations.push({ ...v, width });
  }
  if (allViolations.length > 0) {
    const summary = allViolations
      .slice(0, 20)
      .map((v) => `  [${v.width}px] ${v.kind}: ${v.detail}`)
      .join("\n");
    expect(
      allViolations.length,
      `${allViolations.length}건의 레이아웃 붕괴 발견 (최대 20건 표시):\n${summary}`,
    ).toBe(0);
  }
}
