import { addLocalDays } from "@lib/localDateTime";

import type { DateRangePreset } from "./DateRangeField";

/**
 * A small, ready-made preset set a caller can hand straight to `DateRangeField`'s
 * `presets` prop, or pick from and adapt. Kept out of the component itself:
 * hard-coding "This week" into every consumer would be the same
 * domain-specifics-in-a-shared-primitive problem the `DataTable` ticket
 * (LOS-0424) explicitly rules out.
 *
 * Lives in its own module, apart from the component, so that file exports only
 * the component and this one only a function — the split React Fast Refresh
 * needs to keep working.
 */
export function buildCommonDateRangePresets(): readonly DateRangePreset[] {
  return [
    { label: "Today", range: (today) => ({ start: today, end: today }) },
    {
      label: "Next 7 days",
      range: (today) => ({ start: today, end: addLocalDays(today, 6) }),
    },
    {
      label: "Next 30 days",
      range: (today) => ({ start: today, end: addLocalDays(today, 29) }),
    },
  ];
}
