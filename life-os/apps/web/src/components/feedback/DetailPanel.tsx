import type { ReactNode } from "react";

import { Spinner } from "@components/ui";

import { Drawer, type DrawerProps } from "./Drawer";
import { EmptyState } from "./EmptyState";
import "./detail-panel.css";

/**
 * DetailPanel (LOS-0414).
 *
 * A `Drawer` for showing exactly one record by id, composed with the loading
 * and not-found states that showing *a specific* record always needs — a
 * concern generic enough for `Drawer` itself, which knows nothing about
 * records at all.
 *
 * The deep-link wiring lives in `useDeepLinkParam` (`@hooks`), not here: the
 * caller calls it themselves, uses its `open`/`close` to drive this
 * component's `open`/`onClose`, and resolves whatever the current id points
 * to into `content` — `undefined` while that resolution is in flight, `null`
 * once it is known to have failed, the real content otherwise. This is the
 * same "the component supplies the shape, the caller supplies the state"
 * split every controlled composed component in this design system already
 * uses; owning the hook internally here would have left the caller with no
 * way to open the panel from their own trigger (a list row's click, say) in
 * the first place.
 *
 * The not-found case reuses `EmptyState`'s `permission` variant rather than
 * inventing a third "not found" shape: `29-PRODUCT-VOCABULARY.md`'s own
 * "Not found/private" copy ("This item isn't available… may have been
 * removed, or you may not have access") already states unavailability
 * without confirming which case it is, and a shared link to a record that
 * was since deleted is exactly that ambiguity.
 */

export interface DetailPanelProps extends Omit<DrawerProps, "children"> {
  /** `undefined` while resolving the current id, `null` once it is known not to resolve, otherwise the content to show. */
  readonly content: ReactNode | null | undefined;
  readonly loadingLabel?: string;
  readonly notFoundTitle?: string;
  readonly notFoundDescription?: string;
}

export function DetailPanel({
  content,
  loadingLabel = "Loading…",
  notFoundTitle = "This item isn't available.",
  notFoundDescription = "It may have been removed, or you may not have access.",
  ...drawerProps
}: DetailPanelProps) {
  return (
    <Drawer {...drawerProps}>
      {content === undefined ? (
        <div className="lifeos-detail-panel__loading">
          <Spinner label={loadingLabel} labelVisible />
        </div>
      ) : content === null ? (
        <EmptyState variant="permission" title={notFoundTitle} description={notFoundDescription} />
      ) : (
        content
      )}
    </Drawer>
  );
}
