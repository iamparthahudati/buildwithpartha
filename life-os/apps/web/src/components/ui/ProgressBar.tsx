import { useId } from "react";

import { readProgress } from "./progress";
import type { ProgressSize, ProgressTone } from "./scales";
import "./progress-bar.css";
import "./visually-hidden.css";

/**
 * ProgressBar (LOS-0321).
 *
 * The bar reports a real measurement or it reports nothing. There is no
 * "roughly there" mode: a determinate bar that guesses is worse than an
 * indeterminate one, because the user acts on the number.
 *
 * `indeterminate` is for work whose end is genuinely unknown. It carries no
 * `aria-valuenow`, which is what tells assistive technology the value is
 * unknown rather than zero.
 */

export interface ProgressBarProps {
  /**
   * What is being measured, e.g. "Weekly plan capacity". Required: a bare
   * percentage names neither its metric nor its base, so it cannot be read.
   */
  readonly label: string;
  /** Hides the label visually while keeping it for assistive technology. */
  readonly labelHidden?: boolean;
  readonly value?: number;
  readonly max?: number;
  /** Work whose end is unknown. Omits the value rather than inventing one. */
  readonly indeterminate?: boolean;
  readonly tone?: ProgressTone;
  readonly size?: ProgressSize;
  /**
   * What the value means in words, e.g. "3 of 8 tasks done". Announced instead
   * of the raw percentage, and shown beside the label when `showValue` is set.
   */
  readonly valueText?: string;
  readonly showValue?: boolean;
  readonly className?: string;
}

export function ProgressBar({
  label,
  labelHidden = false,
  value = 0,
  max = 100,
  indeterminate = false,
  tone = "primary",
  size = "md",
  valueText,
  showValue = false,
  className,
}: ProgressBarProps) {
  const labelId = useId();
  const reading = readProgress(value, max);
  const spokenValue = valueText ?? `${reading.percent}%`;

  return (
    <div
      className={[
        "lifeos-progress-bar",
        `lifeos-progress-bar--${size}`,
        `lifeos-progress-bar--${tone}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/*
        A value shown without its label is an unexplained number — "40%" of
        what? — so hiding the label hides the value with it. The measurement is
        still announced through the progressbar's own value text.
      */}
      {labelHidden ? (
        <span id={labelId} className="lifeos-visually-hidden">
          {label}
        </span>
      ) : (
        <div className="lifeos-progress-bar__header">
          <span id={labelId} className="lifeos-progress-bar__label">
            {label}
          </span>
          {showValue && !indeterminate ? (
            <span className="lifeos-progress-bar__value" aria-hidden="true">
              {spokenValue}
            </span>
          ) : null}
        </div>
      )}

      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={reading.max}
        // An indeterminate bar reports no value at all. Reporting zero would
        // say the work has not started, which is a different thing entirely.
        {...(indeterminate
          ? {}
          : { "aria-valuenow": reading.value, "aria-valuetext": spokenValue })}
        className={[
          "lifeos-progress-bar__track",
          indeterminate && "is-indeterminate",
          reading.ratio >= 1 && "is-complete",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className="lifeos-progress-bar__fill"
          // The one value CSS cannot derive on its own.
          style={indeterminate ? undefined : { inlineSize: `${reading.ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
