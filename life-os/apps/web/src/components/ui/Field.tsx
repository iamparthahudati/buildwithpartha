import type { ReactNode } from "react";

import { FieldMessages } from "./FieldMessages";
import type { FieldIds } from "./fieldIds";
import "./field.css";
import "./visually-hidden.css";

/**
 * The shared frame around a single form control (LOS-0317).
 *
 * Every control needs the same four things — a real label bound to it, an
 * optional description, an error, and an optional confirmation — and every one
 * of those relationships is silent when it breaks: a description that is not
 * referenced is simply never announced. Building the frame once is what stops
 * the fifth control from being the one that quietly gets it wrong.
 *
 * The control itself is passed as `children` so each component keeps ownership
 * of its own element and native behaviour.
 */

export interface FieldProps {
  /** Derived once by the control with `fieldIds`, so both agree on the wiring. */
  readonly ids: FieldIds;
  readonly label: string;
  /** Hides the label visually while keeping it for assistive technology. */
  readonly labelHidden?: boolean;
  readonly description?: string;
  readonly error?: string;
  /** Confirmation text, e.g. after a successful async check. */
  readonly success?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
  /** Rendered after the messages, e.g. a counter or a strength meter. */
  readonly footer?: ReactNode;
}

export function Field({
  ids,
  label,
  labelHidden = false,
  description,
  error,
  success,
  disabled = false,
  className,
  children,
  footer,
}: FieldProps) {
  return (
    <div
      className={["lifeos-field", error && "has-error", disabled && "is-disabled", className]
        .filter(Boolean)
        .join(" ")}
    >
      <label
        htmlFor={ids.controlId}
        className={["lifeos-field__label", labelHidden && "lifeos-visually-hidden"]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
      </label>

      {children}

      <FieldMessages
        {...(description ? { description } : {})}
        descriptionId={ids.descriptionId}
        {...(error ? { error } : {})}
        errorId={ids.errorId}
      />

      {/*
        Success never shows beside an error: two contradictory verdicts on one
        field leave the user with no idea which one to act on.
      */}
      {success && !error ? (
        <span className="lifeos-field__success" role="status">
          {success}
        </span>
      ) : null}

      {footer}
    </div>
  );
}
