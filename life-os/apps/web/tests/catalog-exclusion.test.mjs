import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/*
 * The component catalog is a development tool. LOS-0303 excludes it from
 * production rather than protecting it behind a check at runtime: an artifact
 * that was never built cannot be reached, guessed at, or left enabled by a
 * misconfigured environment variable.
 */

test("catalog.html exists for the dev server but is not a build input", async () => {
  await stat(join(webRoot, "catalog.html"));

  const viteConfig = await readFile(join(webRoot, "vite.config.ts"), "utf8");

  assert.match(
    viteConfig,
    /rollupOptions:\s*\{[\s\S]*?input:\s*new URL\("\.\/index\.html"/,
    "vite.config.ts must name index.html as its only build input",
  );
  // Comments may name the file; only real configuration counts.
  const configuration = viteConfig.replaceAll(/\/\/[^\n]*/g, "");
  assert.ok(
    !configuration.includes("catalog.html"),
    "catalog.html must never be declared as a build input",
  );
});

test("the catalog entry refuses to mount outside development", async () => {
  const entry = await readFile(join(webRoot, "src/catalog/main.tsx"), "utf8");

  assert.match(entry, /if \(!import\.meta\.env\.DEV\) \{/);
  assert.match(
    entry,
    /throw new Error\("The LifeOS component catalog is a development-only tool\./,
  );
});

test("no built artifact contains the catalog", async (context) => {
  const distRoot = join(webRoot, "dist");

  let files;
  try {
    files = await collectFiles(distRoot);
  } catch {
    context.skip("dist/ is absent; run a build first");
    return;
  }

  for (const file of files) {
    assert.ok(
      !file.toLowerCase().includes("catalog"),
      `${file} looks like a catalog artifact and must not be in dist/`,
    );
  }

  const html = files.filter((file) => file.endsWith(".html"));
  assert.deepEqual(html, ["index.html"], "dist/ must contain only the application entry document");

  for (const file of files.filter((candidate) => candidate.endsWith(".js"))) {
    const contents = await readFile(join(distRoot, file), "utf8");
    assert.ok(
      !contents.includes("catalog-root"),
      `${file} bundles catalog code; the catalog must not ship`,
    );
  }
});

async function collectFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(join(directory, entry.name), relativePath)));
    } else {
      files.push(relativePath);
    }
  }

  return files.sort();
}
