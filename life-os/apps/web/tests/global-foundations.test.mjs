import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const stylesRoot = join(dirname(fileURLToPath(import.meta.url)), "../src/styles");

const globalCss = await readFile(join(stylesRoot, "global.css"), "utf8");
const resetCss = await readFile(join(stylesRoot, "reset.css"), "utf8");

test("global.css layers tokens before the reset before the application rules", () => {
  const tokensAt = globalCss.indexOf('@import "./tokens.css"');
  const resetAt = globalCss.indexOf('@import "./reset.css"');

  assert.ok(tokensAt >= 0, "global.css must import the tokens");
  assert.ok(resetAt > tokensAt, "the reset must be imported after the tokens it consumes");
  assert.ok(
    globalCss.indexOf("body {") > resetAt,
    "application rules must come after the reset so they win",
  );
});

test("the reset keeps native list semantics", () => {
  assert.ok(
    !/list-style\s*:\s*none/.test(resetCss),
    "removing list markers globally strips list semantics in some screen readers",
  );
});

test("the reset never sets a pixel root font size", () => {
  const html = /html\s*\{([\s\S]*?)\n\}/.exec(resetCss);
  assert.ok(html, "reset.css must declare an html rule");
  assert.match(html[1], /font-size:\s*100%/);
  assert.ok(
    !/font-size:\s*\d+px/.test(html[1]),
    "a px root size overrides the user's browser font-size setting",
  );
});

test("the reset restores form control typography and keeps hidden authoritative", () => {
  assert.match(resetCss, /input,\s*\n\s*button,\s*\n\s*textarea,\s*\n\s*select/);
  assert.match(resetCss, /font:\s*inherit;/);
  assert.match(resetCss, /\[hidden\]\s*\{\s*\n\s*display:\s*none\s*!important;/);
});

test("the reset declares no raw color and no fixed viewport-blocking width", () => {
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(resetCss), "reset.css must consume tokens, not literals");
  assert.match(resetCss, /max-width:\s*100%/, "media must not overflow small viewports");
});

test("focus is visible for keyboard users and never removed outright", () => {
  assert.match(
    globalCss,
    /:focus-visible\s*\{[\s\S]*?outline:\s*var\(--lifeos-border-width-focus\) solid var\(--lifeos-color-focus-ring\);/,
  );
  // Suppressing the pointer ring is allowed only for :focus:not(:focus-visible).
  assert.match(globalCss, /:focus:not\(:focus-visible\)\s*\{\s*\n\s*outline:\s*none;/);
});

test("the skip link stays focusable, is layered above everything and reveals on focus", () => {
  const skipLink = /\.lifeos-skip-link\s*\{([\s\S]*?)\n\}/.exec(globalCss);
  assert.ok(skipLink, "global.css must style the skip link");

  assert.ok(
    !/display:\s*none/.test(skipLink[1]) && !/visibility:\s*hidden/.test(skipLink[1]),
    "the skip link must remain focusable, so it may not be display:none or visibility:hidden",
  );
  assert.match(skipLink[1], /z-index:\s*var\(--lifeos-z-skip-link\)/);
  assert.match(skipLink[1], /transform:\s*translateY\(calc\(-100%/);
  assert.match(
    globalCss,
    /\.lifeos-skip-link:focus-visible\s*\{\s*\n\s*transform:\s*translateY\(0\);/,
  );
});

test("reduced motion is honored and smooth scrolling is opt-in", () => {
  const reduce = /@media \(prefers-reduced-motion: reduce\)([\s\S]*?)^\}/m.exec(globalCss);
  assert.ok(reduce, "global.css must declare a reduced-motion backstop");
  assert.match(reduce[1], /animation-duration:\s*0\.01ms\s*!important/);
  assert.match(reduce[1], /transition-duration:\s*0\.01ms\s*!important/);
  assert.match(reduce[1], /scroll-behavior:\s*auto\s*!important/);

  const noPreference = /@media \(prefers-reduced-motion: no-preference\)([\s\S]*?)^\}/m.exec(
    globalCss,
  );
  assert.ok(noPreference, "smooth scrolling must be opt-in behind no-preference");
  assert.match(noPreference[1], /scroll-behavior:\s*smooth/);
});

test("forced colors hand the palette back to the user", () => {
  const forced = /@media \(forced-colors: active\)([\s\S]*?)^\}/m.exec(globalCss);
  assert.ok(forced, "global.css must declare forced-colors hooks");
  assert.match(forced[1], /outline:\s*var\(--lifeos-border-width-focus\) solid CanvasText/);
  assert.match(forced[1], /box-shadow:\s*none/, "shadows carry no meaning in forced colors");
});

test("increased contrast promotes the quietest tokens", () => {
  const contrast = /@media \(prefers-contrast: more\)([\s\S]*?)^\}/m.exec(globalCss);
  assert.ok(contrast, "global.css must respond to prefers-contrast");
  assert.match(contrast[1], /--lifeos-color-border:\s*var\(--lifeos-color-border-strong\)/);
  assert.match(contrast[1], /--lifeos-color-text-muted:\s*var\(--lifeos-color-text-secondary\)/);
});
