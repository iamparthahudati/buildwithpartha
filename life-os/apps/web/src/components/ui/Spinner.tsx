import type { SpinnerSize } from "./scales";
import "./spinner.css";
import "./visually-hidden.css";

/**
 * Spinner (LOS-0323).
 *
 * A spinner says "something is happening" and nothing else. It cannot say what
 * is loading, how long it will take, or what to do if it never finishes, so it
 * is never the whole answer: a region that is waiting still needs real copy
 * ("Loading tasks…"), and a list that is waiting is better served by
 * `Skeleton`, which reserves the space the content will take.
 *
 * `label` is required for that reason. A spinner with no name is a shape that
 * screen-reader users cannot interpret, and the requirement makes it a type
 * error rather than something to catch in review.
 */

export interface SpinnerProps {
  /** What is being waited for, e.g. "Loading tasks…". */
  readonly label: string;
  /**
   * Shows the label beside the spinner. It is hidden by default because most
   * spinners sit inside a region that already carries the waiting copy, and
   * repeating it would say the same thing twice.
   */
  readonly labelVisible?: boolean;
  readonly size?: SpinnerSize;
  readonly className?: string;
}

export function Spinner({ label, labelVisible = false, size = "md", className }: SpinnerProps) {
  return (
    <span
      // Polite, not assertive: waiting is not an interruption.
      role="status"
      className={["lifeos-spinner", `lifeos-spinner--${size}`, className].filter(Boolean).join(" ")}
    >
      <span className="lifeos-spinner__disc" aria-hidden="true" />
      <span className={labelVisible ? "lifeos-spinner__label" : "lifeos-visually-hidden"}>
        {label}
      </span>
    </span>
  );
}
