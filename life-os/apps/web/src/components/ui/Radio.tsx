import { useId, type InputHTMLAttributes } from "react";

import { FieldMessages } from "./FieldMessages";
import { fieldIds } from "./fieldIds";
import "./choice.css";

/**
 * Radio and RadioGroup (LOS-0312).
 *
 * Grouping is done with a real `<fieldset>` and `<legend>`, and the options are
 * real radio inputs sharing a `name`. Arrow-key navigation, the roving tab
 * stop and "only one selected" all come from the browser — none of it is
 * re-implemented here, which is precisely the point.
 */

export interface RadioOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

type NativeGroupProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className" | "children" | "value" | "onChange"
>;

export interface RadioGroupProps extends NativeGroupProps {
  /** The group's visible name. Rendered as a legend, not an aria-label. */
  readonly legend: string;
  readonly name: string;
  readonly options: readonly RadioOption[];
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  readonly description?: string;
  readonly error?: string;
  readonly orientation?: "vertical" | "horizontal";
  readonly className?: string;
}

export function RadioGroup({
  legend,
  name,
  options,
  value,
  onValueChange,
  description,
  error,
  orientation = "vertical",
  className,
  disabled,
  ...rest
}: RadioGroupProps) {
  const baseId = useId();
  const ids = fieldIds(baseId, {
    hasDescription: Boolean(description),
    hasError: Boolean(error),
  });

  return (
    <fieldset
      className={["lifeos-radio-group", `lifeos-radio-group--${orientation}`, className]
        .filter(Boolean)
        .join(" ")}
      aria-describedby={ids.describedBy}
      aria-invalid={error ? true : undefined}
      disabled={disabled}
    >
      <legend className="lifeos-radio-group__legend">{legend}</legend>

      <div className="lifeos-radio-group__options">
        {options.map((option) => {
          const optionId = `${baseId}-${option.value}`;
          const optionDescriptionId = option.description ? `${optionId}-description` : undefined;

          return (
            <div
              key={option.value}
              className={["lifeos-choice", option.disabled && "is-disabled"]
                .filter(Boolean)
                .join(" ")}
            >
              <label className="lifeos-choice__row" htmlFor={optionId}>
                <input
                  {...rest}
                  id={optionId}
                  type="radio"
                  name={name}
                  value={option.value}
                  className="lifeos-choice__input"
                  disabled={option.disabled ?? false}
                  {...(value === undefined ? {} : { checked: value === option.value })}
                  aria-describedby={optionDescriptionId}
                  onChange={(event) => onValueChange?.(event.target.value)}
                />
                <span className="lifeos-choice__label">{option.label}</span>
              </label>
              {option.description ? (
                <span id={optionDescriptionId} className="lifeos-field__description">
                  {option.description}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <FieldMessages
        {...(description ? { description } : {})}
        descriptionId={ids.descriptionId}
        {...(error ? { error } : {})}
        errorId={ids.errorId}
      />
    </fieldset>
  );
}
