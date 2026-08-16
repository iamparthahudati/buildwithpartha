import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";

import { FieldMessages } from "./FieldMessages";
import { IconButton } from "./IconButton";
import { fieldIds } from "./fieldIds";
import "./text-input.css";

/**
 * TextInput (LOS-0314).
 *
 * The label is always a real `<label>` bound by `htmlFor`. A placeholder is
 * never a label: it disappears the moment the user types, which leaves them
 * with no way to check what the field was for.
 */

// `prefix` is a global RDFa attribute in React's DOM typings; ours is a
// rendered adornment, so the native one is dropped rather than merged.
type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "children" | "size" | "prefix"
>;

export interface TextInputProps extends NativeProps {
  readonly label: string;
  /** Hides the label visually while keeping it for assistive technology. */
  readonly labelHidden?: boolean;
  readonly description?: string;
  readonly error?: string;
  /** Confirmation text, e.g. after a successful async check. */
  readonly success?: string;
  /** Static adornment before the value, such as a currency symbol. */
  readonly prefix?: ReactNode;
  /** Static adornment after the value, such as a unit. */
  readonly suffix?: ReactNode;
  /** Shows a clear button once there is a value. */
  readonly onClear?: () => void;
  readonly clearLabel?: string;
  readonly className?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  {
    label,
    labelHidden = false,
    description,
    error,
    success,
    prefix,
    suffix,
    onClear,
    clearLabel = "Clear",
    className,
    disabled,
    readOnly,
    id,
    type = "text",
    value,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const ids = fieldIds(id ?? generatedId, {
    hasDescription: Boolean(description),
    hasError: Boolean(error),
  });

  const hasValue = value !== undefined && value !== "";
  const showClear = Boolean(onClear) && hasValue && !disabled && !readOnly;

  return (
    <div
      className={["lifeos-text-input", error && "has-error", disabled && "is-disabled", className]
        .filter(Boolean)
        .join(" ")}
    >
      <label
        htmlFor={ids.controlId}
        className={["lifeos-text-input__label", labelHidden && "lifeos-visually-hidden"]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
      </label>

      <div className="lifeos-text-input__control">
        {prefix ? (
          <span className="lifeos-text-input__affix" aria-hidden="true">
            {prefix}
          </span>
        ) : null}

        <input
          {...rest}
          ref={ref}
          id={ids.controlId}
          type={type}
          className="lifeos-text-input__field"
          disabled={disabled}
          readOnly={readOnly}
          {...(value === undefined ? {} : { value })}
          aria-describedby={ids.describedBy}
          aria-invalid={error ? true : undefined}
        />

        {showClear ? (
          <IconButton
            icon={X}
            label={clearLabel}
            size="sm"
            variant="ghost"
            className="lifeos-text-input__clear"
            onClick={onClear}
            // Keeps the clear button out of the tab order: it duplicates a
            // capability the keyboard already has, and a tab stop between
            // every field would slow keyboard users down.
            tabIndex={-1}
          />
        ) : null}

        {suffix ? (
          <span className="lifeos-text-input__affix" aria-hidden="true">
            {suffix}
          </span>
        ) : null}
      </div>

      <FieldMessages
        {...(description ? { description } : {})}
        descriptionId={ids.descriptionId}
        {...(error ? { error } : {})}
        errorId={ids.errorId}
      />

      {success && !error ? (
        <span className="lifeos-field__success" role="status">
          {success}
        </span>
      ) : null}
    </div>
  );
});
