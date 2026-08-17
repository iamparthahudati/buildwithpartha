/**
 * Which page numbers actually render (LOS-0421).
 *
 * A pure function, the same reasoning as `breadcrumbsCollapse.ts`/
 * `menuPosition.ts`: testable without mounting anything. Unlike
 * `breadcrumbsCollapse`'s single collapse point, pagination needs two —
 * one gap on either side of the current page once there are enough pages —
 * so the first and last page stay reachable in one click from anywhere in
 * a long list, with the current page's own neighborhood always visible.
 */

export type PaginationEntry =
  { readonly type: "page"; readonly page: number } | { readonly type: "ellipsis" };

function range(start: number, end: number): readonly number[] {
  return Array.from({ length: end - start + 1 }, (_unused, index) => start + index);
}

export function paginationRange(
  page: number,
  totalPages: number,
  siblingCount: number = 1,
): readonly PaginationEntry[] {
  const totalSlots = siblingCount * 2 + 5; // first + last + current + siblings on both sides + 2 ellipses

  if (totalPages <= totalSlots) {
    return range(1, totalPages).map((pageNumber) => ({ type: "page", page: pageNumber }));
  }

  const leftSibling = Math.max(page - siblingCount, 1);
  const rightSibling = Math.min(page + siblingCount, totalPages);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftItemCount = 3 + siblingCount * 2;
    return [
      ...range(1, leftItemCount).map((pageNumber) => toPageEntry(pageNumber)),
      { type: "ellipsis" },
      toPageEntry(totalPages),
    ];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightItemCount = 3 + siblingCount * 2;
    return [
      toPageEntry(1),
      { type: "ellipsis" },
      ...range(totalPages - rightItemCount + 1, totalPages).map((pageNumber) =>
        toPageEntry(pageNumber),
      ),
    ];
  }

  return [
    toPageEntry(1),
    { type: "ellipsis" },
    ...range(leftSibling, rightSibling).map((pageNumber) => toPageEntry(pageNumber)),
    { type: "ellipsis" },
    toPageEntry(totalPages),
  ];
}

function toPageEntry(page: number): PaginationEntry {
  return { type: "page", page };
}
