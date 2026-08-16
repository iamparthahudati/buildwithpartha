import { forwardRef, useEffect, useId, useRef, type InputHTMLAttributes } from "react";

import { FieldMessages } from "./FieldMessages";
import { fieldIds } from "./fieldIds";
import "./choice.css";

/**
 * Checkbox (LOS-0311).
 *
 * A real `<input type="checkbox">` with a real `<label>`. Every alternative —
 * a styled div with `role="checkbox"`, a click handler on a span — has to
 * re-implement keyboard activation, form participation and the label
 * relationship, and one of those always ends up subtly wrong.
 */

type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className" | "children" | "checked"
>;

export interface CheckboxProps extends NativeProps {
  readonly label: string;
  readonly checked?: boolean;
  /**
   * Renders the mixed state, for a parent whose children are partly selected.
   * Indeterminate is a DOM property, not an attribute, so it can only be set
   * imperatively — which is why this component owns a ref internally.
   */
  readonly indeterminate?: boolean;
  readonly description?: string;
  readonly error?: string;
  readonly className?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, checked, indeterminate = false, description, error, className, disabled, id, ...rest },
  forwardedRef,
) {
  const generatedId = useId();
  const ids = fieldIds(id ?? generatedId, {
    hasDescription: Boolean(description),
    hasError: Boolean(error),
  });

  const localRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (localRef.current) {
      localRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <div
      className={["lifeos-choice", disabled && "is-disabled", className].filter(Boolean).join(" ")}
    >
      <label className="lifeos-choice__row" htmlFor={ids.controlId}>
        <input
          {...rest}
          ref={(node) => {
            localRef.current = node;
            if (typeof forwardedRef === "function") {
              forwardedRef(node);
            } else if (forwardedRef) {
              forwardedRef.current = node;
            }
          }}
          id={ids.controlId}
          type="checkbox"
          className="lifeos-choice__input"
          disabled={disabled}
          {...(checked === undefined ? {} : { checked })}
          aria-describedby={ids.describedBy}
          aria-invalid={error ? true : undefined}
        />
        <span className="lifeos-choice__label">{label}</span>
      </label>

      <div className="lifeos-choice__messages">
        <FieldMessages
          {...(description ? { description } : {})}
          descriptionId={ids.descriptionId}
          {...(error ? { error } : {})}
          errorId={ids.errorId}
        />
      </div>
    </div>
  );
});
