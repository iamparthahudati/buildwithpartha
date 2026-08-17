import { describe, expect, it } from "vitest";

import { paginationRange } from "./paginationRange";

function pages(entries: ReturnType<typeof paginationRange>): readonly (number | "…")[] {
  return entries.map((entry) => (entry.type === "ellipsis" ? "…" : entry.page));
}

describe("paginationRange", () => {
  it("shows every page uncollapsed when the total is small", () => {
    expect(pages(paginationRange(1, 5))).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses the right side when near the start", () => {
    expect(pages(paginationRange(1, 20))).toEqual([1, 2, 3, 4, 5, "…", 20]);
  });

  it("collapses the left side when near the end", () => {
    expect(pages(paginationRange(20, 20))).toEqual([1, "…", 16, 17, 18, 19, 20]);
  });

  it("collapses both sides in the middle", () => {
    expect(pages(paginationRange(10, 20))).toEqual([1, "…", 9, 10, 11, "…", 20]);
  });

  it("keeps the current page's immediate neighbors visible", () => {
    const entries = paginationRange(10, 20);
    expect(pages(entries)).toContain(9);
    expect(pages(entries)).toContain(11);
  });

  it("never shows a page number below 1 or above totalPages", () => {
    const entries = paginationRange(10, 20);
    const numbers = entries.filter((e) => e.type === "page").map((e) => e.page);
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(20);
  });

  it("respects a wider siblingCount", () => {
    expect(pages(paginationRange(10, 20, 2))).toEqual([1, "…", 8, 9, 10, 11, 12, "…", 20]);
  });

  it("handles a single page", () => {
    expect(pages(paginationRange(1, 1))).toEqual([1]);
  });
});
