import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { findDesignTokenViolations } from "../scripts/verify-design-tokens.mjs";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const stylesRoot = join(webRoot, "src/styles");

const tokensCss = await readFile(join(stylesRoot, "tokens.css"), "utf8");
const tokensTs = await readFile(join(stylesRoot, "tokens.ts"), "utf8");
const rootDeclarations = readRootDeclarations(tokensCss);

test("the real source tree uses only frozen design tokens", async () => {
  assert.deepEqual(await findDesignTokenViolations(join(webRoot, "src")), []);
});

test("tokens.ts mirrors every color and chart value declared in tokens.css", () => {
  const mirrored = [
    ...tokensTs.matchAll(/"(--lifeos-(?:color|chart)-[a-z0-9-]+)":\s*"(#[0-9a-f]{6})"/g),
  ];

  assert.ok(
    mirrored.length >= 40,
    `expected the TypeScript mirror to cover the token set, saw ${mirrored.length}`,
  );

  for (const [, name, expected] of mirrored) {
    assert.equal(resolveToken(name, rootDeclarations), expected, `${name} drifted from tokens.css`);
  }
});

test("every semantic color token declared in CSS is mirrored in TypeScript", () => {
  const declared = [...rootDeclarations.keys()].filter(
    (name) => name.startsWith("--lifeos-color-") || name.startsWith("--lifeos-chart-"),
  );

  for (const name of declared) {
    // rgb() overlays are intentionally CSS-only; they are never used for contrast math.
    if (resolveToken(name, rootDeclarations).startsWith("rgb")) continue;
    assert.ok(tokensTs.includes(`"${name}"`), `${name} is missing from tokens.ts`);
  }
});

test("breakpoint and stacking scales match between CSS and TypeScript", () => {
  for (const [, name, pixels] of tokensTs.matchAll(/^\s{2}(sm|md|lg|xl):\s*(\d+),$/gm)) {
    assert.equal(resolveToken(`--lifeos-breakpoint-${name}`, rootDeclarations), `${pixels}px`);
  }

  const cssNameByKey = { skipLink: "skip-link" };
  for (const [, key, value] of tokensTs.matchAll(
    /^\s{2}(base|raised|sticky|navigation|drawer|overlay|dialog|popover|tooltip|toast|skipLink):\s*(\d+),$/gm,
  )) {
    const cssName = cssNameByKey[key] ?? key;
    assert.equal(resolveToken(`--lifeos-z-${cssName}`, rootDeclarations), value);
  }

  assert.equal(resolveToken("--lifeos-layout-min-width", rootDeclarations), "320px");
});

test("font size, spacing and radius tokens stay in rem so 200% zoom scales", () => {
  const scalable = [...rootDeclarations].filter(
    ([name]) =>
      name.startsWith("--lifeos-font-size-") ||
      name.startsWith("--lifeos-space-") ||
      name.startsWith("--lifeos-radius-"),
  );

  assert.ok(scalable.length > 0);
  for (const [name, value] of scalable) {
    assert.ok(value === "0" || value.endsWith("rem"), `${name} must use rem or 0, saw ${value}`);
  }
});

test("no font size drops below the 12px floor", () => {
  const sizes = [...rootDeclarations]
    .filter(([name]) => name.startsWith("--lifeos-font-size-"))
    .map(([name, value]) => [name, Number.parseFloat(value)]);

  assert.ok(sizes.length > 0);
  for (const [name, size] of sizes) {
    assert.ok(size >= 0.75, `${name} is below the 0.75rem floor`);
  }
});

test("the minimum pointer target stays at 44px", () => {
  assert.equal(resolveToken("--lifeos-target-min-size", rootDeclarations), "2.75rem");
});

test("reduced motion zeroes every animated duration", () => {
  const reducedMotion = /@media \(prefers-reduced-motion: reduce\)([\s\S]*?)\n\}/.exec(tokensCss);
  assert.ok(reducedMotion, "tokens.css must declare a reduced-motion block");

  const animated = [...rootDeclarations].filter(
    ([name, value]) => name.startsWith("--lifeos-motion-duration-") && value !== "0ms",
  );

  assert.ok(animated.length > 0);
  for (const [name] of animated) {
    assert.ok(
      reducedMotion[1].includes(`${name}: 0ms;`),
      `${name} is not disabled under reduced motion`,
    );
  }
});

test("compact density restores 44px targets on coarse pointers", () => {
  const coarse = /@media \(pointer: coarse\)\s*\{([\s\S]*?)^\}/m.exec(tokensCss);
  assert.ok(coarse, "tokens.css must restore touch targets for coarse pointers");
  assert.match(coarse[1], /--lifeos-density-control-height: var\(--lifeos-target-min-size\);/);
  assert.match(coarse[1], /--lifeos-density-row-height: var\(--lifeos-target-min-size\);/);
});

/** Declarations from the `:root` block, before any media or attribute override. */
function readRootDeclarations(source) {
  const rootBlock = /^:root\s*\{([\s\S]*?)^\}/m.exec(source);
  assert.ok(rootBlock, "tokens.css must declare a top-level :root block");

  const declarations = new Map();
  for (const match of rootBlock[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    declarations.set(match[1], match[2].trim());
  }

  return declarations;
}

/** Follows `var(--other)` indirection until a literal value is reached. */
function resolveToken(name, declarations) {
  let value = declarations.get(name);
  assert.ok(value !== undefined, `tokens.css does not declare ${name}`);

  const seen = new Set([name]);
  let reference = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(value);

  while (reference) {
    const target = reference[1];
    assert.ok(!seen.has(target), `${name} resolves through a cycle at ${target}`);
    seen.add(target);

    value = declarations.get(target);
    assert.ok(value !== undefined, `${name} references undeclared ${target}`);
    reference = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(value);
  }

  return value;
}

test("accepts semantic token usage", async (context) => {
  const sourceRoot = await createFixture(context, {
    "styles/tokens.css":
      ":root { --palette-blue-500: #3157f5; --lifeos-color-primary: var(--palette-blue-500); }",
    "components/ui/button.css":
      ".button { color: var(--lifeos-color-text-on-solid); background: var(--lifeos-color-primary); }",
    "components/ui/Button.tsx": 'export const tone = "primary";',
  });

  assert.deepEqual(await findDesignTokenViolations(sourceRoot), []);
});

test("rejects raw color literals outside the token file", async (context) => {
  const sourceRoot = await createFixture(context, {
    "styles/tokens.css": ":root { --lifeos-color-primary: #3157f5; }",
    "components/ui/badge.css": ".badge { color: #101828; }",
    "components/ui/chart.ts": 'export const series = "rgb(49 87 245)";',
  });

  const violations = await findDesignTokenViolations(sourceRoot);

  assert.equal(violations.length, 2);
  assert.match(violations[0], /badge\.css contains a raw hex color \(#101828\)/);
  assert.match(violations[1], /chart\.ts contains a raw rgb color/);
});

test("rejects named colors and private palette access", async (context) => {
  const sourceRoot = await createFixture(context, {
    "styles/tokens.css": ":root { --palette-white: #ffffff; }",
    "components/ui/card.css": ".card { background: white; border-color: var(--palette-white); }",
  });

  const violations = await findDesignTokenViolations(sourceRoot);

  assert.equal(violations.length, 2);
  assert.match(violations[0], /card\.css reads the private --palette-\* layer/);
  assert.match(violations[1], /card\.css sets background with the named color white/);
});

test("ignores color literals inside comments", async (context) => {
  const sourceRoot = await createFixture(context, {
    "styles/tokens.css": ":root { --lifeos-color-primary: #3157f5; }",
    "components/ui/note.css":
      "/* was #101828 before LOS-0301 */\n.note { color: var(--lifeos-color-text); }",
  });

  assert.deepEqual(await findDesignTokenViolations(sourceRoot), []);
});

async function createFixture(context, files) {
  const sourceRoot = await mkdtemp(join(tmpdir(), "lifeos-tokens-"));
  context.after(async () => {
    await rm(sourceRoot, { recursive: true, force: true });
  });

  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = join(sourceRoot, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, contents, "utf8");
  }

  return sourceRoot;
}
