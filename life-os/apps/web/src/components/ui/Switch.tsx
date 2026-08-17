import { forwardRef, useId, type InputHTMLAttributes } from "react";

import { FieldMessages } from "./FieldMessages";
import { fieldIds } from "./fieldIds";
import "./switch.css";
import "./visually-hidden.css";

/**
 * Switch (LOS-0313).
 *
 * A switch is for a setting that takes effect immediately. A checkbox is for a
 * value that is submitted with a form. Choosing the wrong one misleads the
 * user about when their change actually happened, so this component states the
 * distinction rather than leaving it to convention.
 *
 * Built on a checkbox input with `role="switch"`, so it keeps native keyboard
 * activation and form participation while being announced as on/off.
 */

type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className" | "children" | "role" | "checked"
>;

export interface SwitchProps extends NativeProps {
  readonly label: string;
  readonly checked?: boolean;
  readonly description?: string;
  readonly error?: string;
  /**
   * The change is being saved. The control is held inert so a second toggle
   * cannot race the first, and the pending state is announced.
   */
  readonly saving?: boolean;
  /** Announced while `saving`. */
  readonly savingLabel?: string;
  readonly className?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  {
    label,
    checked,
    description,
    error,
    saving = false,
    savingLabel = "Saving",
    className,
    disabled,
    id,
    onChange,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const ids = fieldIds(id ?? generatedId, {
    hasDescription: Boolean(description),
    hasError: Boolean(error),
  });

  return (
    <div
      className={["lifeos-switch", disabled && "is-disabled", saving && "is-saving", className]
        .filter(Boolean)
        .join(" ")}
    >
      <label className="lifeos-switch__row" htmlFor={ids.controlId}>
        <input
          {...rest}
          ref={ref}
          id={ids.controlId}
          type="checkbox"
          role="switch"
          className="lifeos-switch__input"
          disabled={disabled}
          {...(checked === undefined ? {} : { checked })}
          aria-describedby={ids.describedBy}
          aria-invalid={error ? true : undefined}
          aria-busy={saving || undefined}
          onChange={(event) => {
            // A toggle in flight must not be re-entered; the second change
            // would otherwise be applied on top of an unconfirmed first.
            if (saving) {
              event.preventDefault();
              return;
            }

            onChange?.(event);
          }}
        />
        <span className="lifeos-switch__track" aria-hidden="true">
          <span className="lifeos-switch__thumb" />
        </span>
        <span className="lifeos-switch__label">{label}</span>
        {saving ? <span className="lifeos-visually-hidden">{savingLabel}</span> : null}
      </label>

      <div className="lifeos-switch__messages">
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
