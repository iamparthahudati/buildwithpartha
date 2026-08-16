import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";

import { Button, type ButtonProps } from "./Button";
import type { ButtonSize, ButtonVariant } from "./scales";
import "./icon-button.css";

/**
 * IconButton (LOS-0307).
 *
 * An icon-only control. `label` is required and is not optional in any variant:
 * the icon is decorative and the *control* carries the accessible name. That is
 * the rule LOS-0304 defers to this component, and making the prop required is
 * what enforces it — a missing name here is a type error, not a review comment.
 */

export interface IconButtonProps extends Omit<
  ButtonProps,
  "children" | "iconStart" | "iconEnd" | "fullWidth"
> {
  readonly icon: LucideIcon;
  /** The control's accessible name, e.g. "Delete task". Never the icon's name. */
  readonly label: string;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /**
   * A tooltip may repeat the label for sighted pointer users, but it is never
   * the only place the name exists. Tooltip integration lands with LOS-0326;
   * until then the native `title` provides the same affordance.
   */
  readonly showTitle?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = "ghost", size = "md", showTitle = true, className, ...rest },
  ref,
) {
  const classes = ["lifeos-icon-button", className].filter(Boolean).join(" ");

  return (
    <Button
      {...rest}
      ref={ref}
      variant={variant}
      size={size}
      className={classes}
      iconStart={icon}
      aria-label={label}
      {...(showTitle ? { title: label } : {})}
    >
      {/*
        The visible label is removed from layout but kept in the DOM, so the
        button still has text content if styles fail to load.
      */}
      <span className="lifeos-visually-hidden">{label}</span>
    </Button>
  );
});
