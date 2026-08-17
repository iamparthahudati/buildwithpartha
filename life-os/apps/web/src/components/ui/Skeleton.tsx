import type { CSSProperties } from "react";

import "./skeleton.css";

/**
 * Skeleton (LOS-0324).
 *
 * A skeleton exists to stop the page moving. It reserves the space the real
 * content will occupy, so nothing reflows underneath the user's pointer the
 * moment the data arrives — which is the actual harm a spinner in a list does.
 *
 * Every skeleton is hidden from assistive technology. Announcing a dozen
 * placeholder shapes tells a screen-reader user nothing and buries the one
 * message that matters; the waiting state is announced once, by the region's
 * own status text.
 */

export interface SkeletonProps {
  readonly shape?: "line" | "block" | "circle";
  /** Any CSS length; defaults to filling the available width. */
  readonly width?: string;
  readonly height?: string;
  readonly className?: string;
}

export function Skeleton({ shape = "line", width, height, className }: SkeletonProps) {
  const style: CSSProperties = {};
  if (width !== undefined) {
    style.inlineSize = width;
  }
  if (height !== undefined) {
    style.blockSize = height;
  }

  return (
    <span
      aria-hidden="true"
      className={["lifeos-skeleton", `lifeos-skeleton--${shape}`, className]
        .filter(Boolean)
        .join(" ")}
      style={style}
    />
  );
}

export interface SkeletonTextProps {
  readonly lines?: number;
  readonly className?: string;
}

/** A paragraph placeholder. The last line is short, as a real one usually is. */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  const count = Math.max(1, lines);

  return (
    <span
      aria-hidden="true"
      className={["lifeos-skeleton-text", className].filter(Boolean).join(" ")}
    >
      {Array.from({ length: count }, (_unused, index) => (
        <Skeleton key={index} shape="line" {...(index === count - 1 ? { width: "60%" } : {})} />
      ))}
    </span>
  );
}

export interface SkeletonCardProps {
  readonly lines?: number;
  /** Reserves the avatar or icon slot the loaded card will have. */
  readonly withMedia?: boolean;
  readonly className?: string;
}

export function SkeletonCard({ lines = 2, withMedia = false, className }: SkeletonCardProps) {
  return (
    <span
      aria-hidden="true"
      className={["lifeos-skeleton-card", className].filter(Boolean).join(" ")}
    >
      <span className="lifeos-skeleton-card__header">
        {withMedia ? <Skeleton shape="circle" width="2.5rem" /> : null}
        <Skeleton shape="line" width="45%" height="var(--lifeos-font-size-lg)" />
      </span>
      <SkeletonText lines={lines} />
    </span>
  );
}

export interface SkeletonTableProps {
  readonly rows?: number;
  readonly columns?: number;
  readonly className?: string;
}

/**
 * Rows of a table that has not arrived.
 *
 * Rendered as plain boxes rather than a real `<table>`: an empty table with no
 * headers and no cells is invalid markup that assistive technology would try to
 * describe, and the shapes are hidden anyway.
 */
export function SkeletonTable({ rows = 5, columns = 3, className }: SkeletonTableProps) {
  return (
    <span
      aria-hidden="true"
      className={["lifeos-skeleton-table", className].filter(Boolean).join(" ")}
      style={{ "--lifeos-skeleton-columns": Math.max(1, columns) } as CSSProperties}
    >
      {Array.from({ length: Math.max(1, rows) }, (_unusedRow, rowIndex) => (
        <span key={rowIndex} className="lifeos-skeleton-table__row">
          {Array.from({ length: Math.max(1, columns) }, (_unusedCell, cellIndex) => (
            <Skeleton key={cellIndex} shape="line" />
          ))}
        </span>
      ))}
    </span>
  );
}
