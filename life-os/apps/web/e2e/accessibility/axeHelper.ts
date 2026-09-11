import type { Page } from "@playwright/test";
import axe from "axe-core";

export interface AxeAuditResult {
  violations: axe.Result[];
  passes: axe.Result[];
  incomplete: axe.Result[];
  inapplicable: axe.Result[];
}

export interface AxeAuditOptions {
  includeTags?: string[];
  excludeRules?: string[];
  context?: string | Element;
}

export async function runAxeAudit(
  page: Page,
  options: AxeAuditOptions = {},
): Promise<AxeAuditResult> {
  // Inject axe-core source into the page
  await page.evaluate(axe.source);

  const tags = options.includeTags ?? ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

  const results = await page.evaluate(
    async ({ tags, excludeRules }) => {
      const runOptions: axe.RunOptions = {
        runOnly: {
          type: "tag",
          values: tags,
        },
      };

      if (excludeRules && excludeRules.length > 0) {
        runOptions.rules = {};
        for (const rule of excludeRules) {
          runOptions.rules[rule] = { enabled: false };
        }
      }

      return await (window as unknown as { axe: typeof axe }).axe.run(document, runOptions);
    },
    {
      tags,
      excludeRules: options.excludeRules ?? [],
    },
  );

  return results as AxeAuditResult;
}

export function formatAxeViolations(violations: axe.Result[]): string {
  if (violations.length === 0) return "No violations found.";

  return violations
    .map((v, i) => {
      const nodes = v.nodes
        .map(
          (n) =>
            `    - Target: ${n.target.join(" ")}\n      Snippet: ${n.html.trim().slice(0, 120)}\n      Summary: ${n.failureSummary}`,
        )
        .join("\n");
      return `[${i + 1}] Rule: ${v.id} (${v.impact?.toUpperCase()})\n    Help: ${v.help} (${v.helpUrl})\n${nodes}`;
    })
    .join("\n\n");
}
