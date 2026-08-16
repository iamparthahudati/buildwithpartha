import { forwardRef, useId, type TextareaHTMLAttributes } from "react";

import { FieldMessages } from "./FieldMessages";
import { fieldIds } from "./fieldIds";
import "./textarea.css";

/**
 * Textarea (LOS-0316).
 *
 * Auto-growing uses the `field-sizing: content` CSS property rather than
 * measuring scroll height in JavaScript, so there is no resize observer, no
 * layout thrash and nothing to keep in sync as the value changes. Browsers
 * without support fall back to the fixed rows, which is a graceful loss.
 */

type NativeProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "children">;

export interface TextareaProps extends NativeProps {
  readonly label: string;
  readonly description?: string;
  readonly error?: string;
  /** Grows with its content instead of scrolling inside a fixed box. */
  readonly autoGrow?: boolean;
  /**
   * Shows a live character counter. `maxLength` is intentionally not set on
   * the element as well: silently truncating a paste loses the user's text
   * without telling them, so the counter warns and validation decides.
   */
  readonly counterMax?: number;
  readonly className?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    description,
    error,
    autoGrow = false,
    counterMax,
    className,
    disabled,
    id,
    value,
    rows = 3,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const ids = fieldIds(id ?? generatedId, {
    hasDescription: Boolean(description),
    hasError: Boolean(error),
  });

  // Counts code points, so an emoji is one character rather than two.
  const length = typeof value === "string" ? [...value].length : 0;
  const overLimit = counterMax !== undefined && length > counterMax;

  return (
    <div
      className={["lifeos-textarea", error && "has-error", disabled && "is-disabled", className]
        .filter(Boolean)
        .join(" ")}
    >
      <label htmlFor={ids.controlId} className="lifeos-textarea__label">
        {label}
      </label>

      <textarea
        {...rest}
        ref={ref}
        id={ids.controlId}
        rows={rows}
        className={["lifeos-textarea__field", autoGrow && "is-auto-grow"].filter(Boolean).join(" ")}
        disabled={disabled}
        {...(value === undefined ? {} : { value })}
        aria-describedby={ids.describedBy}
        aria-invalid={error || overLimit ? true : undefined}
      />

      <div className="lifeos-textarea__footer">
        <FieldMessages
          {...(description ? { description } : {})}
          descriptionId={ids.descriptionId}
          {...(error ? { error } : {})}
          errorId={ids.errorId}
        />

        {counterMax === undefined ? null : (
          <span
            className={["lifeos-textarea__counter", overLimit && "is-over"]
              .filter(Boolean)
              .join(" ")}
          >
            {/*
              The number updates on every keystroke, which would be unbearable
              to hear announced. It is hidden from assistive technology, and
              the limit is enforced by validation instead.
            */}
            <span aria-hidden="true">
              {length} / {counterMax}
            </span>
          </span>
        )}
      </div>
    </div>
  );
});
