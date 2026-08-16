import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";

import { ATOM_CATALOG_ENTRIES } from "./atomEntries";
import { FEEDBACK_CATALOG_ENTRIES } from "./feedbackEntries";
import { FORM_CATALOG_ENTRIES } from "./formEntries";
import { STRUCTURE_CATALOG_ENTRIES } from "./structureEntries";

/**
 * LOS-0332 accessibility audit.
 *
 * Every individual component test already runs axe against its own states.
 * This sweep is different: it renders every registered atom specimen exactly
 * as the catalog would — several components side by side, sharing one DOM —
 * because a violation that only appears from two controls interacting (a
 * duplicate id, a landmark collision, a focus trap that leaks) would not show
 * up in either component's isolated test.
 *
 * Only the atom, form-control, feedback and structural entries are covered
 * here (LOS-0304 to LOS-0330); the foundation entries in `entries.tsx` are
 * token/scale swatches with no interactive semantics to violate.
 */
const ATOM_ENTRIES = [
  ...ATOM_CATALOG_ENTRIES,
  ...FORM_CATALOG_ENTRIES,
  ...FEEDBACK_CATALOG_ENTRIES,
  ...STRUCTURE_CATALOG_ENTRIES,
];

describe("catalog accessibility sweep", () => {
  for (const entry of ATOM_ENTRIES) {
    for (const state of entry.states) {
      it(`${entry.name} — ${state.name} has no axe violations`, async () => {
        const { container, unmount } = render(<>{state.render()}</>);

        await expectNoAccessibilityViolations(container);

        unmount();
      });
    }
  }

  it("covers every atom ticket without a silent gap", () => {
    // A ticket with zero specimens would pass the loop above by doing
    // nothing; this is what makes that failure visible.
    expect(ATOM_ENTRIES.length).toBeGreaterThanOrEqual(27);
    expect(ATOM_ENTRIES.flatMap((entry) => entry.states).length).toBeGreaterThan(50);
  });
});
