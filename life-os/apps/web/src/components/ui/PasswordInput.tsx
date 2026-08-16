import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Field } from "./Field";
import { IconButton } from "./IconButton";
import { fieldIds } from "./fieldIds";

/**
 * PasswordInput (LOS-0315).
 *
 * Composed from the same field frame as `TextInput` rather than wrapping it,
 * because the reveal toggle has to sit inside the control's focus ring and
 * needs its own state.
 */

type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "children" | "size" | "type" | "prefix"
>;

export interface PasswordInputProps extends NativeProps {
  readonly label: string;
  readonly description?: string;
  readonly error?: string;
  /**
   * Slot for a strength meter or policy list. It receives no value and never
   * sees the password — anything derived from the value is computed by the
   * caller, so this component cannot leak it.
   */
  readonly help?: ReactNode;
  /**
   * `new-password` on sign-up and reset, `current-password` on sign-in. Getting
   * this wrong stops password managers from offering to generate or fill.
   */
  readonly autoComplete?: "new-password" | "current-password";
  readonly showLabel?: string;
  readonly hideLabel?: string;
  readonly className?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      label,
      description,
      error,
      help,
      autoComplete = "current-password",
      showLabel = "Show password",
      hideLabel = "Hide password",
      className,
      disabled = false,
      id,
      onKeyUp,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const ids = fieldIds(id ?? generatedId, {
      hasDescription: Boolean(description),
      hasError: Boolean(error),
    });

    const [revealed, setRevealed] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);

    return (
      <Field
        ids={ids}
        label={label}
        {...(description ? { description } : {})}
        {...(error ? { error } : {})}
        disabled={disabled}
        {...(className ? { className } : {})}
        footer={
          <>
            {capsLockOn ? (
              /*
               * Announced politely: it is a hint about what is happening now,
               * not a validation failure, and it must not interrupt typing.
               */
              <span className="lifeos-field__description" role="status">
                Caps Lock is on.
              </span>
            ) : null}

            {help ? <div className="lifeos-field__help">{help}</div> : null}
          </>
        }
      >
        <div className="lifeos-field__control">
          <input
            {...rest}
            ref={ref}
            id={ids.controlId}
            /*
             * Toggling `type` is what actually reveals the value. It also means
             * the field leaves password-manager territory while revealed, which
             * is why the toggle defaults back to hidden on every mount.
             */
            type={revealed ? "text" : "password"}
            className="lifeos-field__element"
            disabled={disabled}
            autoComplete={autoComplete}
            aria-describedby={ids.describedBy}
            aria-invalid={error ? true : undefined}
            onKeyUp={(event) => {
              setCapsLockOn(event.getModifierState("CapsLock"));
              onKeyUp?.(event);
            }}
          />

          <IconButton
            icon={revealed ? EyeOff : Eye}
            label={revealed ? hideLabel : showLabel}
            size="sm"
            variant="ghost"
            disabled={disabled}
            // Pressed state, so assistive technology knows the value is visible.
            aria-pressed={revealed}
            onClick={() => setRevealed((current) => !current)}
          />
        </div>
      </Field>
    );
  },
);
