import type { ElementType, ReactNode } from "react";

import "./typography.css";

/**
 * Typography primitives (LOS-0305).
 *
 * Visual size and semantic level are separate props on purpose. A page may need
 * an `h2` that looks small, or an `h3` that leads a section visually — coupling
 * the two would force authors to break the heading outline to get the size they
 * want, which is the most common way heading structure degrades.
 */

export type TextTone = "default" | "secondary" | "muted" | "danger" | "success" | "on-solid";
export type TextWeight = "regular" | "medium" | "semibold" | "bold";
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingSize = "xs" | "sm" | "md" | "lg" | "xl";
export type TextSize = "xs" | "sm" | "md" | "lg";

interface CommonProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly id?: string;
}

function classNames(...values: (string | false | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

const HEADING_SIZE_BY_LEVEL: Record<HeadingLevel, HeadingSize> = {
  1: "xl",
  2: "lg",
  3: "md",
  4: "sm",
  5: "xs",
  6: "xs",
};

interface HeadingProps extends CommonProps {
  /** The document outline position. Never chosen for its appearance. */
  readonly level: HeadingLevel;
  /** Visual size, when it should differ from the level's default. */
  readonly size?: HeadingSize;
  readonly tone?: TextTone;
}

export function Heading({ level, size, tone = "default", children, className, id }: HeadingProps) {
  const Element = `h${level}` as ElementType;
  const appliedSize = size ?? HEADING_SIZE_BY_LEVEL[level];

  return (
    <Element
      id={id}
      className={classNames(
        "lifeos-heading",
        `lifeos-heading--${appliedSize}`,
        `lifeos-tone--${tone}`,
        className,
      )}
    >
      {children}
    </Element>
  );
}

interface TextProps extends CommonProps {
  readonly size?: TextSize;
  readonly tone?: TextTone;
  readonly weight?: TextWeight;
  /** Renders inline (`span`) instead of as a paragraph. */
  readonly inline?: boolean;
  /**
   * Uses tabular numerals. Required wherever a number changes in place —
   * durations, timers, metrics and dates — so digits do not shift width.
   */
  readonly numeric?: boolean;
}

export function Text({
  size = "md",
  tone = "default",
  weight = "regular",
  inline = false,
  numeric = false,
  children,
  className,
  id,
}: TextProps) {
  const Element: ElementType = inline ? "span" : "p";

  return (
    <Element
      id={id}
      className={classNames(
        "lifeos-text",
        `lifeos-text--${size}`,
        `lifeos-tone--${tone}`,
        `lifeos-weight--${weight}`,
        numeric && "lifeos-numeric",
        className,
      )}
    >
      {children}
    </Element>
  );
}

interface CaptionProps extends CommonProps {
  readonly tone?: Extract<TextTone, "secondary" | "muted" | "danger" | "success">;
  readonly numeric?: boolean;
}

/** Small supporting text: field hints, timestamps, table meta. */
export function Caption({
  tone = "muted",
  numeric = false,
  children,
  className,
  id,
}: CaptionProps) {
  return (
    <span
      id={id}
      className={classNames(
        "lifeos-caption",
        `lifeos-tone--${tone}`,
        numeric && "lifeos-numeric",
        className,
      )}
    >
      {children}
    </span>
  );
}

interface MetricProps extends CommonProps {
  /** The number itself. Always tabular so a changing value does not reflow. */
  readonly value: ReactNode;
  /** Names the value. Rendered as its accessible description, not decoration. */
  readonly children: ReactNode;
  readonly size?: Extract<HeadingSize, "sm" | "md" | "lg" | "xl">;
  readonly tone?: TextTone;
}

/**
 * A labelled number. The label is a real element rather than a `title` or
 * `aria-label` so it is visible, translatable and selectable like any text.
 */
export function Metric({
  value,
  children,
  size = "lg",
  tone = "default",
  className,
  id,
}: MetricProps) {
  return (
    <div id={id} className={classNames("lifeos-metric", className)}>
      <span
        className={classNames(
          "lifeos-metric__value",
          `lifeos-heading--${size}`,
          `lifeos-tone--${tone}`,
        )}
      >
        {value}
      </span>
      <span className="lifeos-metric__label">{children}</span>
    </div>
  );
}

interface TruncatedTextProps extends CommonProps {
  /** The full text. Used for the visible clamp and the hover title alike. */
  readonly children: string;
  /** Maximum rendered lines before the text is clamped. */
  readonly lines?: 1 | 2 | 3;
  readonly size?: TextSize;
  readonly tone?: TextTone;
  readonly inline?: boolean;
}

/**
 * Clamps long user content — project names, note titles — to a line budget.
 *
 * The full string stays in the DOM and is only visually clipped, so screen
 * readers and find-in-page still get all of it. `title` is set so a sighted
 * pointer user can recover the rest, but it is never the only way to read it.
 */
export function TruncatedText({
  children,
  lines = 1,
  size = "md",
  tone = "default",
  inline = false,
  className,
  id,
}: TruncatedTextProps) {
  const Element: ElementType = inline ? "span" : "p";

  return (
    <Element
      id={id}
      title={children}
      style={{ "--lifeos-truncate-lines": lines } as Record<string, number>}
      className={classNames(
        "lifeos-text",
        `lifeos-text--${size}`,
        `lifeos-tone--${tone}`,
        "lifeos-truncate",
        className,
      )}
    >
      {children}
    </Element>
  );
}
