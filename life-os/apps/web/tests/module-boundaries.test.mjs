import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  findModuleBoundaryViolations,
  MODULE_ALIASES,
} from "../scripts/verify-module-boundaries.mjs";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("keeps TypeScript and Vite aliases synchronized", async () => {
  const tsconfig = JSON.parse(await readFile(join(webRoot, "tsconfig.json"), "utf8"));
  const viteConfig = await readFile(join(webRoot, "vite.config.ts"), "utf8");

  for (const [alias, directory] of Object.entries(MODULE_ALIASES)) {
    assert.deepEqual(tsconfig.compilerOptions.paths[`${alias}/*`], [`./src/${directory}/*`]);
    assert.ok(
      viteConfig.includes(`"${alias}": new URL("./src/${directory}", import.meta.url).pathname`),
      `expected Vite alias ${alias} to resolve src/${directory}`,
    );
  }
});

test("accepts public aliases and route-only composition", async (context) => {
  const sourceRoot = await createFixture(context, {
    "components/ui/index.ts": "export {};",
    "features/tasks/index.ts": 'export { TaskFeature } from "./TaskFeature";',
    "features/tasks/TaskFeature.tsx": "export function TaskFeature() { return <section />; }",
    "routes/TasksRoute.tsx": [
      'import { TaskFeature } from "@features/tasks";',
      "export function TasksRoute() { return <TaskFeature />; }",
    ].join("\n"),
  });

  assert.deepEqual(await findModuleBoundaryViolations(sourceRoot), []);
});

test("rejects access to feature internals", async (context) => {
  const sourceRoot = await createFixture(context, {
    "components/ui/index.ts": "export {};",
    "features/tasks/index.ts": "export {};",
    "features/tasks/components/TaskCard.tsx":
      "export function TaskCard() { return <article />; }",
    "routes/TasksRoute.tsx": [
      'import { TaskCard } from "@features/tasks/components/TaskCard";',
      "export function TasksRoute() { return <TaskCard />; }",
    ].join("\n"),
  });

  const violations = await findModuleBoundaryViolations(sourceRoot);

  assert.ok(violations.some((violation) => violation.includes("public entrypoint")));
});

test("rejects relative imports across boundaries", async (context) => {
  const sourceRoot = await createFixture(context, {
    "components/ui/index.ts": "export {};",
    "features/tasks/index.ts": "export {};",
    "routes/TasksRoute.tsx": [
      'import "../features/tasks";',
      "export function TasksRoute() { return <main />; }",
    ].join("\n"),
  });

  const violations = await findModuleBoundaryViolations(sourceRoot);

  assert.ok(violations.some((violation) => violation.includes("use an alias")));
});

test("rejects route-local UI components", async (context) => {
  const sourceRoot = await createFixture(context, {
    "components/ui/index.ts": "export {};",
    "features/tasks/index.ts": "export {};",
    "routes/TasksRoute.tsx": [
      "function StatusBadge() { return <span />; }",
      "export function TasksRoute() { return <StatusBadge />; }",
    ].join("\n"),
  });

  const violations = await findModuleBoundaryViolations(sourceRoot);

  assert.ok(violations.some((violation) => violation.includes("declares StatusBadge")));
  assert.ok(violations.some((violation) => violation.includes("declares 2 components")));
});

test("rejects unsupported feature subdirectories", async (context) => {
  const sourceRoot = await createFixture(context, {
    "components/ui/index.ts": "export {};",
    "features/tasks/index.ts": "export {};",
    "features/tasks/services/task-service.ts": "export {};",
  });

  const violations = await findModuleBoundaryViolations(sourceRoot);

  assert.ok(violations.some((violation) => violation.includes("not an approved")));
});

async function createFixture(context, files) {
  const sourceRoot = await mkdtemp(join(tmpdir(), "life-os-boundaries-"));
  context.after(async () => rm(sourceRoot, { recursive: true, force: true }));

  await Promise.all(
    Object.entries(files).map(async ([relativePath, contents]) => {
      const absolutePath = join(sourceRoot, relativePath);
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, contents, "utf8");
    }),
  );

  return sourceRoot;
}
