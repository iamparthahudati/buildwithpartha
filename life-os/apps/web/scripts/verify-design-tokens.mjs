import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * LOS-0301 freezes the design tokens. Only `styles/tokens.css` may hold raw
 * color literals, and only that file may read the private `--palette-*` layer.
 * `styles/tokens.ts` mirrors the resolved values for TypeScript consumers and is
 * kept in step by `styles/tokens.test.ts`.
 */
const COLOR_LITERAL_ALLOWLIST = new Set([
  "styles/tokens.css",
  "styles/tokens.ts",
  // The token proof itself asserts against literal colors on purpose.
  "styles/tokens.test.ts",
]);
const PALETTE_ALLOWLIST = new Set(["styles/tokens.css"]);

const SCANNED_EXTENSIONS = new Set([".css", ".ts", ".tsx", ".js", ".jsx"]);

const COLOR_LITERAL_PATTERNS = [
  { label: "hex color", pattern: /#[0-9a-f]{3,8}\b/gi },
  { label: "rgb color", pattern: /\brgba?\(/gi },
  { label: "hsl color", pattern: /\bhsla?\(/gi },
  { label: "color-mix or color() literal", pattern: /\bcolor(?:-mix)?\(/gi },
];

/** Named CSS colors that quietly bypass the token layer. */
const NAMED_COLOR_PATTERN =
  /(?<![\w-])(?:aqua|black|blue|fuchsia|gray|grey|green|lime|maroon|navy|olive|purple|red|silver|teal|white|yellow|orange|pink)(?![\w-])/gi;

const COLOR_PROPERTY_PATTERN =
  /(?:^|[;{])\s*(color|background|background-color|border-color|outline-color|fill|stroke|box-shadow|text-decoration-color|caret-color|accent-color|border(?:-top|-right|-bottom|-left)?)\s*:\s*([^;}]+)/gi;

export async function findDesignTokenViolations(sourceRoot) {
  const absoluteRoot = resolve(sourceRoot);
  const files = await collectFiles(absoluteRoot);
  const violations = [];

  for (const absoluteFile of files) {
    const relativeFile = toPosix(relative(absoluteRoot, absoluteFile));
    const sourceText = await readFile(absoluteFile, "utf8");

    if (!PALETTE_ALLOWLIST.has(relativeFile) && /var\(\s*--palette-/.test(sourceText)) {
      violations.push(
        `${relativeFile} reads the private --palette-* layer; use a semantic --lifeos-* token.`,
      );
    }

    if (COLOR_LITERAL_ALLOWLIST.has(relativeFile)) {
      continue;
    }

    const scannable = stripComments(sourceText);

    for (const { label, pattern } of COLOR_LITERAL_PATTERNS) {
      const found = scannable.match(pattern);
      if (found) {
        violations.push(
          `${relativeFile} contains a raw ${label} (${unique(found).join(", ")}); use a --lifeos-* token.`,
        );
      }
    }

    for (const match of scannable.matchAll(COLOR_PROPERTY_PATTERN)) {
      const [, property, value] = match;
      const named = value.match(NAMED_COLOR_PATTERN);
      if (named) {
        violations.push(
          `${relativeFile} sets ${property} with the named color ${unique(named).join(", ")}; use a --lifeos-* token.`,
        );
      }
    }
  }

  return violations.sort();
}

export async function verifyDesignTokens(sourceRoot) {
  const violations = await findDesignTokenViolations(sourceRoot);
  if (violations.length > 0) {
    throw new Error(`Design token violations:\n- ${violations.join("\n- ")}`);
  }
}

function stripComments(sourceText) {
  return sourceText.replaceAll(/\/\*[\s\S]*?\*\//g, "").replaceAll(/(?<!:)\/\/[^\n]*/g, "");
}

function unique(values) {
  return [...new Set(values.map((value) => value.trim()))];
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
    } else if (SCANNED_EXTENSIONS.has(extensionOf(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

function extensionOf(fileName) {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot);
}

function toPosix(value) {
  return value.split(/[\\/]/).join("/");
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const sourceRoot = resolve(fileURLToPath(new URL("../src", import.meta.url)));
  try {
    await verifyDesignTokens(sourceRoot);
    console.log("LifeOS design tokens valid: no raw color literals outside styles/tokens.css.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
