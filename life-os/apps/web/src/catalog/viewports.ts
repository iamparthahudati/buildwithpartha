import { BREAKPOINTS, MIN_SUPPORTED_VIEWPORT_WIDTH } from "@styles/tokens";

/**
 * Viewport presets for the catalog stage. Every specimen must be checked at the
 * smallest supported width, so `minimum` is deliberately first: responsive
 * problems show up there before they show up anywhere else.
 */
export interface CatalogViewport {
  readonly id: string;
  readonly name: string;
  /** Stage width in CSS pixels, or `null` to fill the available space. */
  readonly width: number | null;
  readonly description: string;
}

export const CATALOG_VIEWPORTS: readonly CatalogViewport[] = Object.freeze([
  {
    id: "minimum",
    name: "Minimum",
    width: MIN_SUPPORTED_VIEWPORT_WIDTH,
    description: `${MIN_SUPPORTED_VIEWPORT_WIDTH}px — the smallest width LifeOS supports.`,
  },
  {
    id: "small",
    name: "Small",
    width: BREAKPOINTS.sm,
    description: `${BREAKPOINTS.sm}px — large phone.`,
  },
  {
    id: "medium",
    name: "Medium",
    width: BREAKPOINTS.md,
    description: `${BREAKPOINTS.md}px — tablet; the navigation rail begins.`,
  },
  {
    id: "large",
    name: "Large",
    width: BREAKPOINTS.lg,
    description: `${BREAKPOINTS.lg}px — desktop; the persistent sidebar appears.`,
  },
  {
    id: "fluid",
    name: "Fluid",
    width: null,
    description: "Fills the available space, following the browser window.",
  },
]);

export const DEFAULT_VIEWPORT_ID = "fluid";

export function findViewport(viewportId: string): CatalogViewport {
  const viewport = CATALOG_VIEWPORTS.find((candidate) => candidate.id === viewportId);
  if (!viewport) {
    throw new Error(`Unknown catalog viewport "${viewportId}".`);
  }

  return viewport;
}

/** The stage width as a CSS value; a fluid stage is unconstrained. */
export function viewportWidthStyle(viewport: CatalogViewport): string {
  return viewport.width === null ? "100%" : `min(100%, ${viewport.width}px)`;
}
