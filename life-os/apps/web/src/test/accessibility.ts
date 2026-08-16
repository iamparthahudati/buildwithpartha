import axe from "axe-core";
import { expect } from "vitest";

export async function expectNoAccessibilityViolations(container: Element): Promise<void> {
  const results = await axe.run(container, {
    rules: {
      // JSDOM has no layout engine, so axe cannot evaluate color contrast in unit tests.
      "color-contrast": { enabled: false },
    },
  });

  const details = results.violations
    .map((violation) => {
      const targets = violation.nodes.flatMap((node) => node.target).join(", ");
      return `${violation.id}: ${violation.help} (${targets})`;
    })
    .join("\n");

  expect(results.violations, details).toHaveLength(0);
}
