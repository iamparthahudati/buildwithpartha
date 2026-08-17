import { useId } from "react";

import { Icon, VisuallyHidden, fieldIds } from "@components/ui";

import {
  COLOR_SWATCHES,
  ICON_OPTIONS,
  type ColorSwatchName,
  type IconOptionName,
} from "./colorIconPalette";
import "./color-icon-picker.css";

/**
 * ColorIconPicker (LOS-0407).
 *
 * Project and Habit both carry a "color/icon" appearance
 * (`04-DOMAIN-MODEL.md`). Both halves are real native radio groups — one
 * `name` for the eight colors, one for the twelve icons — the same technique
 * `RadioGroup` (LOS-0312) already uses: arrow-key movement, the roving tab
 * stop and "only one selected" all come from the browser, not from script.
 * The native input is not restyled in place the way `Radio.tsx` restyles a
 * checkmark; it is visually hidden and paired with a sibling swatch that
 * reacts to its `:checked` state through CSS, because a colored dot or an
 * icon glyph is not a shape `appearance: none` can produce on its own.
 *
 * The stored value is a name — `"blue"`, `"folder"` — never a hex value or a
 * `--lifeos-*` token string. A future repaint of the palette changes nothing
 * about data already saved, matching how a Task's status is stored as
 * `TO_DO` rather than as whatever color currently represents it.
 */

export interface ColorIconValue {
  readonly color: ColorSwatchName | null;
  readonly icon: IconOptionName | null;
}

export interface ColorIconPickerProps {
  readonly legend: string;
  readonly description?: string;
  readonly error?: string;
  readonly value: ColorIconValue;
  readonly onValueChange: (value: ColorIconValue) => void;
  readonly colorLabel?: string;
  readonly iconLabel?: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function ColorIconPicker({
  legend,
  description,
  error,
  value,
  onValueChange,
  colorLabel = "Color",
  iconLabel = "Icon",
  disabled = false,
  className,
}: ColorIconPickerProps) {
  const baseId = useId();
  const ids = fieldIds(baseId, {
    hasDescription: Boolean(description),
    hasError: Boolean(error),
  });

  const selectedColor = COLOR_SWATCHES.find((swatch) => swatch.name === value.color);
  const selectedIcon = ICON_OPTIONS.find((option) => option.name === value.icon);

  return (
    <fieldset
      className={["lifeos-color-icon-picker", className].filter(Boolean).join(" ")}
      aria-describedby={ids.describedBy}
      aria-invalid={error ? true : undefined}
      disabled={disabled}
    >
      <legend className="lifeos-color-icon-picker__legend">{legend}</legend>

      <div className="lifeos-color-icon-picker__layout">
        <div
          className="lifeos-color-icon-picker__preview"
          style={
            selectedColor === undefined ? undefined : { background: `var(${selectedColor.token})` }
          }
        >
          {selectedIcon === undefined ? null : (
            <Icon
              icon={selectedIcon.icon}
              decorative
              className="lifeos-color-icon-picker__preview-icon"
            />
          )}
        </div>

        <div className="lifeos-color-icon-picker__groups">
          <fieldset className="lifeos-color-icon-picker__group" disabled={disabled}>
            <legend className="lifeos-color-icon-picker__group-legend">{colorLabel}</legend>
            <div className="lifeos-color-icon-picker__swatches">
              {COLOR_SWATCHES.map((swatch) => {
                const optionId = `${baseId}-color-${swatch.name}`;
                return (
                  <label key={swatch.name} htmlFor={optionId} className="lifeos-color-swatch">
                    <input
                      id={optionId}
                      type="radio"
                      name={`${baseId}-color`}
                      className="lifeos-color-swatch__input"
                      checked={value.color === swatch.name}
                      onChange={() => onValueChange({ ...value, color: swatch.name })}
                    />
                    <span
                      className="lifeos-color-swatch__dot"
                      style={{ background: `var(${swatch.token})` }}
                    />
                    <VisuallyHidden>{swatch.label}</VisuallyHidden>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="lifeos-color-icon-picker__group" disabled={disabled}>
            <legend className="lifeos-color-icon-picker__group-legend">{iconLabel}</legend>
            <div className="lifeos-color-icon-picker__swatches">
              {ICON_OPTIONS.map((option) => {
                const optionId = `${baseId}-icon-${option.name}`;
                return (
                  <label key={option.name} htmlFor={optionId} className="lifeos-icon-swatch">
                    <input
                      id={optionId}
                      type="radio"
                      name={`${baseId}-icon`}
                      className="lifeos-icon-swatch__input"
                      checked={value.icon === option.name}
                      onChange={() => onValueChange({ ...value, icon: option.name })}
                    />
                    <span className="lifeos-icon-swatch__glyph">
                      <Icon icon={option.icon} decorative size="sm" />
                    </span>
                    <VisuallyHidden>{option.label}</VisuallyHidden>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      </div>

      {description ? (
        <span id={ids.descriptionId} className="lifeos-field__description">
          {description}
        </span>
      ) : null}

      {error ? (
        <span id={ids.errorId} className="lifeos-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </fieldset>
  );
}
