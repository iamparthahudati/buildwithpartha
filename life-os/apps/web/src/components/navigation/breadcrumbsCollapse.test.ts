import { describe, expect, it } from "vitest";

import { collapseBreadcrumbs, type BreadcrumbItem } from "./breadcrumbsCollapse";

function item(label: string): BreadcrumbItem {
  return { label, href: `/${label.toLowerCase()}` };
}

const TRAIL: readonly BreadcrumbItem[] = [
  item("Home"),
  item("Projects"),
  item("Website refresh"),
  item("Tasks"),
  item("Fix header"),
];

describe("collapseBreadcrumbs", () => {
  it("returns every item uncollapsed when the trail fits", () => {
    const entries = collapseBreadcrumbs(TRAIL.slice(0, 3), 4);
    expect(entries).toEqual([
      { type: "item", item: TRAIL[0], isCurrent: false },
      { type: "item", item: TRAIL[1], isCurrent: false },
      { type: "item", item: TRAIL[2], isCurrent: true },
    ]);
  });

  it("marks only the last item as current", () => {
    const entries = collapseBreadcrumbs(TRAIL.slice(0, 2), 4);
    expect(entries.map((e) => (e.type === "item" ? e.isCurrent : null))).toEqual([false, true]);
  });

  it("collapses the middle once the trail exceeds maxVisible, keeping the first item and the tail", () => {
    // maxVisible 4 reserves 1 slot for the leading item and 3 for the tail,
    // so out of these 5 items only "Projects" is hidden behind the ellipsis.
    const entries = collapseBreadcrumbs(TRAIL, 4);
    expect(entries).toEqual([
      { type: "item", item: TRAIL[0], isCurrent: false },
      { type: "ellipsis", hiddenItems: [TRAIL[1]] },
      { type: "item", item: TRAIL[2], isCurrent: false },
      { type: "item", item: TRAIL[3], isCurrent: false },
      { type: "item", item: TRAIL[4], isCurrent: true },
    ]);
  });

  it("hides exactly one item when the trail is exactly one over the limit", () => {
    const trail = TRAIL.slice(0, 5); // length 5, one more than maxVisible below
    const entries = collapseBreadcrumbs(trail, 4);
    const ellipsis = entries.find((e) => e.type === "ellipsis");
    expect(ellipsis).toBeDefined();
    expect(ellipsis?.type === "ellipsis" ? ellipsis.hiddenItems : []).toHaveLength(1);
  });

  it("returns a single item as current with no ellipsis", () => {
    const entries = collapseBreadcrumbs([item("Home")], 4);
    expect(entries).toEqual([{ type: "item", item: item("Home"), isCurrent: true }]);
  });

  it("returns an empty list for an empty trail", () => {
    expect(collapseBreadcrumbs([], 4)).toEqual([]);
  });

  it("does not collapse when maxVisible is degenerate", () => {
    const entries = collapseBreadcrumbs(TRAIL, 1);
    expect(entries.every((e) => e.type === "item")).toBe(true);
    expect(entries).toHaveLength(TRAIL.length);
  });
});
