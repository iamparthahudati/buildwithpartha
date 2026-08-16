import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Icon } from "./Icon";
import { Spinner } from "./Spinner";
import type { ButtonSize, ButtonVariant } from "./scales";
import "./button.css";
import "./visually-hidden.css";

/**
 * Button (LOS-0306).
 *
 * A real `<button>`, never a styled `div`: keyboard activation, form
 * participation and the button role all come free and cannot drift.
 */

type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export interface ButtonProps extends NativeButtonProps {
  readonly children: ReactNode;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /** Decorative icon before the label. The label carries the meaning. */
  readonly iconStart?: LucideIcon;
  /** Decorative icon after the label, e.g. a disclosure chevron. */
  readonly iconEnd?: LucideIcon;
  /**
   * Shows a busy indicator and blocks activation. Use for a request in flight;
   * the button keeps its width so the layout does not jump.
   */
  readonly loading?: boolean;
  /**
   * Announced while `loading`. Defaults to a neutral phrase; override it when
   * the operation deserves a specific description.
   */
  readonly loadingLabel?: string;
  /** Stretches to the container, for mobile action bars and dialogs. */
  readonly fullWidth?: boolean;
  readonly className?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = "secondary",
    size = "md",
    iconStart,
    iconEnd,
    loading = false,
    loadingLabel = "Working",
    fullWidth = false,
    className,
    disabled = false,
    type = "button",
    ...rest
  },
  ref,
) {
  /*
   * A loading button stays focusable and keeps its accessible name, so the
   * user is not silently dropped out of the tab order mid-interaction. It is
   * `aria-disabled` rather than `disabled`, and activation is blocked in the
   * handler — this is what prevents a double submit.
   */
  const inert = disabled || loading;
  const labelId = useId();

  const classes = [
    "lifeos-button",
    `lifeos-button--${variant}`,
    `lifeos-button--${size}`,
    fullWidth && "lifeos-button--full",
    loading && "is-loading",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      /*
       * While loading, the name is pinned to the label. Without this the busy
       * text would be read instead — the visible label is hidden to make room
       * for the spinner — and the user would lose what the button does at the
       * exact moment they are waiting on it. Referenced text is used for the
       * name even while it is hidden, which is why this works.
       */
      {...(loading ? { "aria-labelledby": labelId } : {})}
      onClick={(event) => {
        if (inert) {
          event.preventDefault();
          return;
        }

        rest.onClick?.(event);
      }}
    >
      {/*
        The label stays in the DOM while loading and is only hidden visually,
        so the button's width — and its accessible name — do not change.
      */}
      <span className="lifeos-button__content" aria-hidden={loading || undefined}>
        {iconStart ? <Icon icon={iconStart} decorative size={size === "lg" ? "md" : "sm"} /> : null}
        <span id={labelId} className="lifeos-button__label">
          {children}
        </span>
        {iconEnd ? <Icon icon={iconEnd} decorative size={size === "lg" ? "md" : "sm"} /> : null}
      </span>

      {loading ? (
        /*
         * The busy state is announced by the spinner's own status region
         * rather than by rewriting the button's name, so "Save changes" stays
         * the thing the user hears and can say to a speech-input tool.
         */
        <span className="lifeos-button__busy">
          <Spinner label={loadingLabel} size={size === "lg" ? "md" : "sm"} />
        </span>
      ) : null}
    </button>
  );
});
