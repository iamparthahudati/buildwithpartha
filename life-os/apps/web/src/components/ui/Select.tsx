import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

import { Field } from "./Field";
import { Icon } from "./Icon";
import { fieldIds } from "./fieldIds";
import "./select.css";

/**
 * Select (LOS-0317).
 *
 * A real `<select>`. A custom listbox would have to re-implement type-ahead,
 * Home/End, PageUp/PageDown, the platform's own touch picker and every
 * screen-reader quirk, and it would still not be the control the user's device
 * knows how to render. Nothing in the LifeOS v1 scope needs option grouping
 * with icons, multi-select or async search, so a custom listbox stays deferred
 * until a requirement proves the native element insufficient.
 *
 * `multiple` is deliberately not exposed: a multi-select list is unusable on
 * touch and is invisible about how to select more than one item. A set of
 * Checkboxes says the same thing honestly.
 */

type NativeProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "className" | "children" | "multiple" | "size"
>;

export interface SelectOption {
  /** The stored value, e.g. a canonical status key. */
  readonly value: string;
  /** The localized label the user reads. */
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectProps extends NativeProps {
  readonly label: string;
  /** Hides the label visually while keeping it for assistive technology. */
  readonly labelHidden?: boolean;
  readonly description?: string;
  readonly error?: string;
  readonly options: readonly SelectOption[];
  /**
   * The empty first option. It stays selectable on an optional field so the
   * user can undo a choice; on a required field it is disabled once a real
   * option exists, because "no answer" is not one of the answers.
   */
  readonly placeholder?: string;
  readonly className?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    labelHidden = false,
    description,
    error,
    options,
    placeholder,
    className,
    disabled = false,
    required = false,
    id,
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
    <Field
      ids={ids}
      label={label}
      labelHidden={labelHidden}
      {...(description ? { description } : {})}
      {...(error ? { error } : {})}
      disabled={disabled}
      {...(className ? { className } : {})}
    >
      <div className="lifeos-field__control lifeos-select__control">
        <select
          {...rest}
          ref={ref}
          id={ids.controlId}
          className="lifeos-field__element lifeos-select__element"
          disabled={disabled}
          required={required}
          aria-describedby={ids.describedBy}
          aria-invalid={error ? true : undefined}
        >
          {placeholder === undefined ? null : (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled ?? false}>
              {option.label}
            </option>
          ))}
        </select>

        {/*
          The chevron replaces the platform arrow that `appearance: none`
          removes. It is decorative: the control already announces itself.
        */}
        <Icon icon={ChevronDown} decorative size="sm" className="lifeos-select__indicator" />
      </div>
    </Field>
  );
});
