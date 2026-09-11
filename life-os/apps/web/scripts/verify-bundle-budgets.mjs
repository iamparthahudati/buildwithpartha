import { readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(currentDir, "../dist");
const assetsDir = join(distDir, "assets");

// Budget thresholds in bytes
export const BUNDLE_BUDGETS = Object.freeze({
  entryJsMaxBytes: 250 * 1024, // 250 KB
  routeChunkMaxBytes: 150 * 1024, // 150 KB
  vendorChunkMaxBytes: 500 * 1024, // 500 KB
  entryCssMaxBytes: 50 * 1024, // 50 KB
  totalCssMaxBytes: 300 * 1024, // 300 KB
  entryHtmlMaxBytes: 10 * 1024, // 10 KB
});

export function verifyBundleBudgets() {
  const violations = [];

  // Check index.html
  const htmlPath = join(distDir, "index.html");
  try {
    const htmlSize = statSync(htmlPath).size;
    if (htmlSize > BUNDLE_BUDGETS.entryHtmlMaxBytes) {
      violations.push(
        `index.html size (${(htmlSize / 1024).toFixed(2)} KB) exceeds budget of ${BUNDLE_BUDGETS.entryHtmlMaxBytes / 1024} KB`,
      );
    }
  } catch {
    violations.push("dist/index.html not found. Please run 'npm run build' first.");
    return violations;
  }

  let totalCssSize = 0;
  const assetFiles = readdirSync(assetsDir);

  for (const file of assetFiles) {
    const filePath = join(assetsDir, file);
    const size = statSync(filePath).size;

    if (file.endsWith(".css")) {
      totalCssSize += size;
      if (file.startsWith("index-") && size > BUNDLE_BUDGETS.entryCssMaxBytes) {
        violations.push(
          `Entry CSS ${file} (${(size / 1024).toFixed(2)} KB) exceeds budget of ${BUNDLE_BUDGETS.entryCssMaxBytes / 1024} KB`,
        );
      }
    } else if (file.endsWith(".js")) {
      if (file.startsWith("index-")) {
        if (size > BUNDLE_BUDGETS.entryJsMaxBytes) {
          violations.push(
            `Entry JS ${file} (${(size / 1024).toFixed(2)} KB) exceeds budget of ${BUNDLE_BUDGETS.entryJsMaxBytes / 1024} KB`,
          );
        }
      } else if (file.includes("Route-")) {
        if (size > BUNDLE_BUDGETS.routeChunkMaxBytes) {
          violations.push(
            `Route chunk ${file} (${(size / 1024).toFixed(2)} KB) exceeds budget of ${BUNDLE_BUDGETS.routeChunkMaxBytes / 1024} KB`,
          );
        }
      } else {
        if (size > BUNDLE_BUDGETS.vendorChunkMaxBytes) {
          violations.push(
            `Vendor/shared chunk ${file} (${(size / 1024).toFixed(2)} KB) exceeds budget of ${BUNDLE_BUDGETS.vendorChunkMaxBytes / 1024} KB`,
          );
        }
      }
    }
  }

  if (totalCssSize > BUNDLE_BUDGETS.totalCssMaxBytes) {
    violations.push(
      `Total CSS size (${(totalCssSize / 1024).toFixed(2)} KB) exceeds budget of ${BUNDLE_BUDGETS.totalCssMaxBytes / 1024} KB`,
    );
  }

  return violations;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const violations = verifyBundleBudgets();
  if (violations.length > 0) {
    console.error("Bundle budget violations detected:\n- " + violations.join("\n- "));
    process.exit(1);
  }
  console.log("LifeOS frontend bundle budgets passed: all chunks within limits.");
}
