import { ArrowLeft } from "lucide-react";

import { Icon, Link } from "@components/ui";

import { canGoBackWithinApp } from "./backLinkSafety";
import "./back-link.css";

/**
 * BackLink (LOS-0417).
 *
 * "Back" means the browser's own history only when the page was actually
 * reached from elsewhere in this app — `canGoBackWithinApp` checks that
 * against `document.referrer`. When it was not (a bookmark, a shared link, a
 * direct load), this renders as a real `Link` to `fallbackHref` instead of a
 * history button that would do nothing or leave the app entirely. Either way
 * the control looks and behaves the same to the user; only the underlying
 * element differs, the same as `Link`'s own `external` case changing its
 * attributes without changing its shape.
 */

export interface BackLinkProps {
  readonly label?: string;
  /** Where to send the user when there is no in-app history to return to. */
  readonly fallbackHref: string;
  readonly className?: string;
}

export function BackLink({ label = "Back", fallbackHref, className }: BackLinkProps) {
  const canGoBack = canGoBackWithinApp(document.referrer, window.location.origin);
  const classes = ["lifeos-back-link", className].filter(Boolean).join(" ");

  if (canGoBack) {
    return (
      <button type="button" className={classes} onClick={() => window.history.back()}>
        <Icon icon={ArrowLeft} decorative size="sm" />
        {label}
      </button>
    );
  }

  return (
    <Link href={fallbackHref} quiet className={classes}>
      <Icon icon={ArrowLeft} decorative size="sm" />
      {label}
    </Link>
  );
}
