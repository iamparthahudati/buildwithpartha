import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const builtIndexUrl = new URL("../dist/index.html", import.meta.url);

test("production HTML keeps LifeOS assets under the nested public path", async () => {
  const html = await readFile(builtIndexUrl, "utf8");
  const assetReferences = Array.from(
    html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g),
    (match) => match[1],
  );

  assert.match(html, /<title>LifeOS<\/title>/);
  assert.match(html, /<div id="root"><\/div>/);
  assert.ok(assetReferences.length >= 2, "expected built JavaScript and CSS assets");

  for (const assetReference of assetReferences) {
    assert.ok(
      assetReference?.startsWith("/life-os/assets/"),
      `expected nested LifeOS asset path, received ${assetReference}`,
    );
  }
});
