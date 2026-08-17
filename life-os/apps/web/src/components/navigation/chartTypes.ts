import type { ColorSwatchName } from "@components/forms";

/**
 * One data point, shared by `BarChart`/`LineChart`/`DonutChart` (LOS-0429).
 * Kept apart from any one of the three components so none of them appears
 * to "own" a type the other two depend on equally.
 */
export interface ChartDatum {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  /** Defaults to cycling through the eight frozen chart tokens by index. */
  readonly colorName?: ColorSwatchName;
}
