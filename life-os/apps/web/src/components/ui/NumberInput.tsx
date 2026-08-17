import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  type InputHTMLAttributes,
} from "react";

import { Field } from "./Field";
import { fieldIds } from "./fieldIds";
import "./number-input.css";

/**
 * NumberInput (LOS-0320).
 *
 * The value stays canonical: a `.` decimal separator, no grouping, exactly what
 * `type="number"` exchanges and what the API stores. Localized display —
 * grouping separators, units, percentages — happens at the display boundary in
 * `Metric` and the formatters, never in the field the user is editing. A field
 * that reformats while it is being typed into fights the user.
 *
 * Scrolling the page over a focused number field silently changes its value in
 * most browsers; the user's next glance finds an estimate they never entered.
 * The listener below removes that, and does it without stealing focus, which is
 * what the usual `blur()` workaround costs.
 */

type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "children" | "size" | "type" | "prefix" | "value" | "defaultValue" | "min" | "max"
>;

export interface NumberInputProps extends NativeProps {
  readonly label: string;
  /** Hides the label visually while keeping it for assistive technology. */
  readonly labelHidden?: boolean;
  readonly description?: string;
  readonly error?: string;
  /** Canonical, unformatted. An empty string is a cleared field. */
  readonly value?: number | string;
  readonly defaultValue?: number | string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /**
   * A unit shown after the value, e.g. `minutes`. It is announced rather than
   * hidden: a number whose unit is only visible means nothing when read aloud.
   */
  readonly unit?: string;
  readonly className?: string;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    label,
    labelHidden = false,
    description,
    error,
    value,
    min,
    max,
    step = 1,
    unit,
    inputMode,
    className,
    disabled = false,
    readOnly = false,
    id,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const ids = fieldIds(baseId, {
    hasDescription: Boolean(description),
    hasError: Boolean(error),
  });

  const unitId = unit === undefined ? undefined : `${baseId}-unit`;
  const describedBy = [ids.describedBy, unitId].filter(Boolean).join(" ") || undefined;

  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle<HTMLInputElement | null, HTMLInputElement | null>(
    ref,
    () => inputRef.current,
    [],
  );

  useEffect(() => {
    const element = inputRef.current;
    if (element === null) {
      return;
    }

    const blockValueChange = (event: WheelEvent) => {
      // Only while the field is focused: that is the only time the browser
      // would change the value, so page scrolling is otherwise untouched.
      if (document.activeElement === element) {
        event.preventDefault();
      }
    };

    // Registered directly rather than through `onWheel`, because React attaches
    // wheel listeners passively at the root and a passive listener cannot
    // prevent the default action.
    element.addEventListener("wheel", blockValueChange, { passive: false });
    return () => {
      element.removeEventListener("wheel", blockValueChange);
    };
  }, []);

  return (
    <Field
      ids={ids}
      label={label}
      labelHidden={labelHidden}
      {...(description ? { description } : {})}
      {...(error ? { error } : {})}
      disabled={disabled}
      {...(className ? { className } : {})}
    >
      <div className="lifeos-field__control">
        <input
          {...rest}
          ref={inputRef}
          id={ids.controlId}
          type="number"
          className="lifeos-field__element lifeos-number-input__element"
          disabled={disabled}
          readOnly={readOnly}
          step={step}
          {...(min === undefined ? {} : { min })}
          {...(max === undefined ? {} : { max })}
          {...(value === undefined ? {} : { value })}
          // A whole-number step gets the digits-only keypad; anything else has
          // to offer a decimal separator.
          inputMode={inputMode ?? (Number.isInteger(step) ? "numeric" : "decimal")}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
        />

        {unit === undefined ? null : (
          <span id={unitId} className="lifeos-field__affix">
            {unit}
          </span>
        )}
      </div>
    </Field>
  );
});
