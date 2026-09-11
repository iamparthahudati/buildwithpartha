import assert from "node:assert/strict";
import test from "node:test";

import { verifyBundleBudgets, BUNDLE_BUDGETS } from "../scripts/verify-bundle-budgets.mjs";

test("production bundle adheres to established size budgets", () => {
  const violations = verifyBundleBudgets();
  assert.deepEqual(
    violations,
    [],
    `Expected 0 bundle budget violations, found: ${violations.join("; ")}`,
  );
});

test("bundle budget thresholds are properly configured", () => {
  assert.equal(BUNDLE_BUDGETS.entryJsMaxBytes, 250 * 1024);
  assert.equal(BUNDLE_BUDGETS.routeChunkMaxBytes, 150 * 1024);
  assert.equal(BUNDLE_BUDGETS.vendorChunkMaxBytes, 500 * 1024);
  assert.equal(BUNDLE_BUDGETS.entryCssMaxBytes, 50 * 1024);
  assert.equal(BUNDLE_BUDGETS.totalCssMaxBytes, 300 * 1024);
});
