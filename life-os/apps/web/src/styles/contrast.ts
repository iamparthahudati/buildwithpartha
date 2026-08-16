/**
 * WCAG 2.2 relative luminance and contrast math used to prove that the frozen
 * LifeOS color tokens meet the accessibility contract before any component
 * consumes them.
 */

export interface RgbColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

/** WCAG 2.2 AA minimum ratios. */
export const CONTRAST_MINIMUM = Object.freeze({
  /** Body and other text below 18.66px bold / 24px regular. */
  normalText: 4.5,
  /** Text at or above 18.66px bold / 24px regular. */
  largeText: 3,
  /** Borders, focus rings, icons, chart marks and other non-text boundaries. */
  nonText: 3,
});

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function parseHexColor(value: string): RgbColor {
  if (!HEX_COLOR.test(value)) {
    throw new Error(`Expected a six-digit hex color, received "${value}".`);
  }

  return {
    red: Number.parseInt(value.slice(1, 3), 16),
    green: Number.parseInt(value.slice(3, 5), 16),
    blue: Number.parseInt(value.slice(5, 7), 16),
  };
}

function toLinearChannel(channel: number): number {
  const proportion = channel / 255;
  return proportion <= 0.04045 ? proportion / 12.92 : ((proportion + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: RgbColor): number {
  return (
    0.2126 * toLinearChannel(color.red) +
    0.7152 * toLinearChannel(color.green) +
    0.0722 * toLinearChannel(color.blue)
  );
}

/** Returns the WCAG contrast ratio between two hex colors, from 1 to 21. */
export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(parseHexColor(foreground));
  const backgroundLuminance = relativeLuminance(parseHexColor(background));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsContrast(foreground: string, background: string, minimum: number): boolean {
  return contrastRatio(foreground, background) + Number.EPSILON >= minimum;
}
