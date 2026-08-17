import { ChevronLeft, ChevronRight } from "lucide-react";

import { IconButton, Text } from "@components/ui";

import { paginationRange } from "./paginationRange";
import "./pagination.css";

/**
 * Pagination (LOS-0421).
 *
 * `<nav>` with a real accessible name, real `<button>` page controls with
 * `aria-current="page"` on the current one, and Previous/Next disabled at
 * the real boundaries rather than merely styled to look inert.
 *
 * `page`/`onPageChange` is a plain controlled pair — like `Tabs` (LOS-0416),
 * this component has no opinion on whether the caller backs it with
 * `useState` (forgotten on reload) or `useDeepLinkParam` (LOS-0414, a URL
 * that survives one). "URL integration" is that same caller choice, not a
 * feature this component adds itself.
 *
 * The compact mobile variant is a `Text` reading "Page X of Y" that
 * replaces the numbered buttons below the small breakpoint — automatic by
 * breakpoint, CSS choosing which of the two already-rendered pieces is
 * visible, the same mechanism `FilterBar` (LOS-0420) uses for its own
 * inline-versus-Drawer collapse.
 */

export interface PaginationProps {
  /** 1-indexed. */
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly onPageChange: (page: number) => void;
  /** The nav's accessible name, e.g. "Tasks pagination". */
  readonly label: string;
  readonly className?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  label,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const entries = paginationRange(page, totalPages);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <nav aria-label={label} className={["lifeos-pagination", className].filter(Boolean).join(" ")}>
      <IconButton
        icon={ChevronLeft}
        label="Previous page"
        variant="ghost"
        disabled={!canGoPrevious}
        onClick={() => onPageChange(page - 1)}
      />

      <span className="lifeos-pagination__pages">
        {entries.map((entry, index) => {
          if (entry.type === "ellipsis") {
            return (
              <span
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className="lifeos-pagination__ellipsis"
              >
                …
              </span>
            );
          }

          const isCurrent = entry.page === page;
          return (
            <button
              key={entry.page}
              type="button"
              aria-current={isCurrent ? "page" : undefined}
              aria-label={`Page ${entry.page}`}
              className={["lifeos-pagination__page", isCurrent && "is-current"]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onPageChange(entry.page)}
            >
              {entry.page}
            </button>
          );
        })}
      </span>

      <Text size="sm" tone="secondary" className="lifeos-pagination__compact">
        Page {page} of {totalPages}
      </Text>

      <IconButton
        icon={ChevronRight}
        label="Next page"
        variant="ghost"
        disabled={!canGoNext}
        onClick={() => onPageChange(page + 1)}
      />
    </nav>
  );
}
