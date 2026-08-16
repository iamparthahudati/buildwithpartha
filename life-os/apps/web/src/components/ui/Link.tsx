import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";

import { Icon } from "./Icon";
import "./link.css";

/**
 * Link (LOS-0308).
 *
 * A link navigates; a button acts. Anything that changes state without going
 * somewhere is a `Button` with the `link` variant instead.
 *
 * There is no `disabled` prop, deliberately. A disabled anchor is not a real
 * thing: removing `href` strips the link role and drops the element from the
 * tab order without telling anyone why. When a destination is unavailable,
 * render text — or a disabled button if it was an action all along.
 */

type NativeAnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children">;

export interface LinkProps extends NativeAnchorProps {
  readonly href: string;
  readonly children: ReactNode;
  /**
   * Marks the link as pointing at the user's current location. Rendered as
   * `aria-current="page"`, so it is announced and not only styled.
   */
  readonly current?: boolean;
  /**
   * Opens in a new tab and appends a visual indicator plus a spoken note, so
   * the change of context is never a surprise. Always sets `rel` safely.
   */
  readonly external?: boolean;
  /** Renders at the surrounding text size, for links inside a paragraph. */
  readonly inline?: boolean;
  /** Suppresses the underline until hover, for dense navigation lists. */
  readonly quiet?: boolean;
  readonly className?: string;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    href,
    children,
    current = false,
    external = false,
    inline = false,
    quiet = false,
    className,
    ...rest
  },
  ref,
) {
  const classes = [
    "lifeos-link",
    inline && "lifeos-link--inline",
    quiet && "lifeos-link--quiet",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <a
      {...rest}
      ref={ref}
      href={href}
      className={classes}
      aria-current={current ? "page" : undefined}
      /*
       * `noopener` denies the opened page access to `window.opener`, and
       * `noreferrer` withholds the referrer. Both are set together because a
       * new tab is the only case where either matters.
       */
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
    >
      {children}
      {external ? (
        <>
          <Icon icon={ExternalLink} decorative size="sm" className="lifeos-link__external" />
          <span className="lifeos-visually-hidden">(opens in a new tab)</span>
        </>
      ) : null}
    </a>
  );
});
