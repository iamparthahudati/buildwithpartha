import { useId, type CSSProperties } from "react";

import { readProgress } from "./progress";
import type { ProgressSize, ProgressTone } from "./scales";
import "./progress-ring.css";
import "./visually-hidden.css";

/**
 * ProgressRing (LOS-0322).
 *
 * The same reading as `ProgressBar`, drawn as a dial for a single headline
 * measure. It shares `readProgress` rather than repeating the arithmetic, so a
 * ring and a bar showing the same metric can never disagree about it.
 *
 * The arc is a conic gradient driven by one custom property. There is no SVG
 * geometry to compute in JavaScript and nothing to recalculate on resize; the
 * ring scales with its font size like everything else.
 */

export interface ProgressRingProps {
  /** What is being measured. A ring with no metric is an unreadable number. */
  readonly label: string;
  /** Hides the label visually while keeping it for assistive technology. */
  readonly labelHidden?: boolean;
  readonly value?: number;
  readonly max?: number;
  readonly tone?: ProgressTone;
  readonly size?: ProgressSize;
  readonly thickness?: "thin" | "regular" | "thick";
  /** What the value means in words, e.g. "6 of 8 habits". */
  readonly valueText?: string;
  /** Overrides the text in the middle of the ring. Defaults to the percentage. */
  readonly centerText?: string;
  readonly className?: string;
}

export function ProgressRing({
  label,
  labelHidden = false,
  value = 0,
  max = 100,
  tone = "primary",
  size = "md",
  thickness = "regular",
  valueText,
  centerText,
  className,
}: ProgressRingProps) {
  const labelId = useId();
  const reading = readProgress(value, max);
  const spokenValue = valueText ?? `${reading.percent}%`;

  return (
    <div
      className={[
        "lifeos-progress-ring",
        `lifeos-progress-ring--${size}`,
        `lifeos-progress-ring--${thickness}`,
        `lifeos-progress-ring--${tone}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={reading.max}
        aria-valuenow={reading.value}
        aria-valuetext={spokenValue}
        className={[
          "lifeos-progress-ring__dial",
          reading.ratio <= 0 && "is-empty",
          reading.ratio >= 1 && "is-complete",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ "--lifeos-progress-ratio": reading.ratio } as CSSProperties}
      >
        {/*
          The centre text repeats what the ring already announces, so it is
          hidden from assistive technology rather than read out twice.
        */}
        <span className="lifeos-progress-ring__value" aria-hidden="true">
          {centerText ?? spokenValue}
        </span>
      </div>

      <span
        id={labelId}
        className={labelHidden ? "lifeos-visually-hidden" : "lifeos-progress-ring__label"}
      >
        {label}
      </span>
    </div>
  );
}
