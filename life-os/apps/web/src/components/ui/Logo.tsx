import "./logo.css";

/**
 * Logo and wordmark (LOS-0328).
 *
 * Original LifeOS marks. The reference screens this product was sketched
 * against belong to other products, and their identities are not a source of
 * anything here: the wordmark is the product name set in the LifeOS type scale,
 * and the symbol is a plain geometric placeholder drawn from the tokens.
 *
 * Both are drawn in `currentColor` and sized in `em`, so a mark inherits the
 * colour and size of whatever names it — a header, a sign-in card, a footer —
 * instead of carrying a fixed pixel box that stops matching at 200% zoom.
 */

export interface LogoProps {
  /**
   * `lockup` is the symbol beside the name, `wordmark` the name alone, and
   * `symbol` the mark alone for places too narrow for the name.
   */
  readonly variant?: "lockup" | "wordmark" | "symbol";
  readonly size?: "sm" | "md" | "lg";
  /**
   * The accessible name for a bare symbol. It names the destination, not the
   * picture: "LifeOS home" on a header link, not "LifeOS logo".
   */
  readonly label?: string;
  /**
   * Set when the surrounding link or heading already names the destination, so
   * the mark is not announced twice.
   */
  readonly decorative?: boolean;
  readonly className?: string;
}

export function Logo({
  variant = "lockup",
  size = "md",
  label = "LifeOS",
  decorative = false,
  className,
}: LogoProps) {
  const classes = ["lifeos-logo", `lifeos-logo--${size}`, className].filter(Boolean).join(" ");

  if (variant === "wordmark") {
    return (
      <span className={classes} {...(decorative ? { "aria-hidden": true } : {})}>
        <span className="lifeos-logo__wordmark">LifeOS</span>
      </span>
    );
  }

  if (variant === "symbol") {
    return (
      <span className={classes}>
        <LogoSymbol {...(decorative ? { decorative: true } : { label })} />
      </span>
    );
  }

  return (
    <span className={classes} {...(decorative ? { "aria-hidden": true } : {})}>
      {/* The name beside it already carries the meaning. */}
      <LogoSymbol decorative />
      <span className="lifeos-logo__wordmark">LifeOS</span>
    </span>
  );
}

type LogoSymbolProps = { readonly decorative: true } | { readonly label: string };

function LogoSymbol(props: LogoSymbolProps) {
  const accessibility =
    "decorative" in props
      ? ({ "aria-hidden": true, focusable: false } as const)
      : ({ role: "img", "aria-label": props.label } as const);

  return (
    <svg
      className="lifeos-logo__symbol"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...accessibility}
    >
      {/* A frame — the system — around a line that climbs: the life inside it. */}
      <rect x="3" y="3" width="18" height="18" rx="6" />
      <path d="M7.5 15.5 11 11.5l3 2 3.5-4.5" />
    </svg>
  );
}
