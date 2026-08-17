/**
 * Which breadcrumbs actually render (LOS-0417).
 *
 * A pure function for the same reason `menuPosition.ts` (LOS-0415) and
 * `tooltipPosition.ts` (LOS-0326) are: the collapse rule is testable without
 * mounting anything, and the component holds only the wiring. Once there are
 * more items than fit, the trail keeps its first item (the root, usually
 * "Home") and its last few items (immediate context and the current page),
 * collapsing everything in between behind a single expandable entry rather
 * than losing the middle of the path with no way back to it.
 */

export interface BreadcrumbItem {
  readonly label: string;
  readonly href: string;
}

export type BreadcrumbEntry =
  | { readonly type: "item"; readonly item: BreadcrumbItem; readonly isCurrent: boolean }
  | { readonly type: "ellipsis"; readonly hiddenItems: readonly BreadcrumbItem[] };

export function collapseBreadcrumbs(
  items: readonly BreadcrumbItem[],
  maxVisible: number,
): readonly BreadcrumbEntry[] {
  const lastIndex = items.length - 1;

  if (items.length <= maxVisible || maxVisible < 2) {
    return items.map((item, index) => toItemEntry(item, index === lastIndex));
  }

  const tailCount = maxVisible - 1;
  const first = items[0];
  const tail = items.slice(items.length - tailCount);
  const hiddenItems = items.slice(1, items.length - tailCount);

  if (first === undefined) {
    return [];
  }

  return [
    toItemEntry(first, lastIndex === 0),
    { type: "ellipsis", hiddenItems },
    ...tail.map((item, offset) =>
      toItemEntry(item, items.length - tailCount + offset === lastIndex),
    ),
  ];
}

function toItemEntry(item: BreadcrumbItem, isCurrent: boolean): BreadcrumbEntry {
  return { type: "item", item, isCurrent };
}
