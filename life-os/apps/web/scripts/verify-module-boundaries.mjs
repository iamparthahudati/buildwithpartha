import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const MODULE_ALIASES = Object.freeze({
  "@app": "app",
  "@assets": "assets",
  "@catalog": "catalog",
  "@components": "components",
  "@features": "features",
  "@hooks": "hooks",
  "@lib": "lib",
  "@routes": "routes",
  "@state": "state",
  "@styles": "styles",
  "@test": "test",
  "@types": "types",
});

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const FEATURE_SUBDIRECTORIES = new Set(["api", "components", "hooks", "model", "test"]);

export async function findModuleBoundaryViolations(sourceRoot) {
  const absoluteSourceRoot = resolve(sourceRoot);
  const sourceFiles = await collectSourceFiles(absoluteSourceRoot);
  const violations = [];

  await verifyPublicEntrypoints(absoluteSourceRoot, "features", violations);
  await verifyPublicEntrypoints(absoluteSourceRoot, "components", violations);
  await verifyFeatureSubdirectories(absoluteSourceRoot, violations);

  for (const absoluteFile of sourceFiles) {
    const relativeFile = toPosix(relative(absoluteSourceRoot, absoluteFile));
    const sourceText = await readFile(absoluteFile, "utf8");

    for (const moduleSpecifier of collectModuleSpecifiers(sourceText)) {
      verifyImport(relativeFile, moduleSpecifier, violations);
    }

    if (relativeFile.startsWith("routes/") && extname(relativeFile).includes("x")) {
      verifyRouteComposition(relativeFile, sourceText, violations);
    }
  }

  return violations.sort();
}

export async function verifyModuleBoundaries(sourceRoot) {
  const violations = await findModuleBoundaryViolations(sourceRoot);
  if (violations.length > 0) {
    throw new Error(`Frontend module boundary violations:\n- ${violations.join("\n- ")}`);
  }
}

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(absolutePath)));
    } else if (SOURCE_EXTENSIONS.has(extname(entry.name)) && !entry.name.endsWith(".d.ts")) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function verifyPublicEntrypoints(sourceRoot, collection, violations) {
  const collectionRoot = join(sourceRoot, collection);
  const entries = await readdir(collectionRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const directoryEntries = await readdir(join(collectionRoot, entry.name));
    if (!directoryEntries.includes("index.ts") && !directoryEntries.includes("index.tsx")) {
      violations.push(
        `${collection}/${entry.name} must expose a public index.ts or index.tsx entrypoint`,
      );
    }
  }
}

async function verifyFeatureSubdirectories(sourceRoot, violations) {
  const featuresRoot = join(sourceRoot, "features");
  const features = await readdir(featuresRoot, { withFileTypes: true });

  for (const feature of features) {
    if (!feature.isDirectory()) {
      continue;
    }

    const entries = await readdir(join(featuresRoot, feature.name), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !FEATURE_SUBDIRECTORIES.has(entry.name)) {
        violations.push(
          `features/${feature.name}/${entry.name} is not an approved feature subdirectory`,
        );
      }
    }
  }
}

function collectModuleSpecifiers(sourceText) {
  const specifiers = [];

  const patterns = [
    /(?:^|\n)\s*import\s+(?:type\s+)?(?:[^;"']*?\s+from\s+)?["']([^"']+)["']/g,
    /(?:^|\n)\s*export\s+(?:type\s+)?[^;"']*?\s+from\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of sourceText.matchAll(pattern)) {
      if (match[1]) {
        specifiers.push(match[1]);
      }
    }
  }

  return specifiers;
}

function verifyImport(sourceFile, moduleSpecifier, violations) {
  if (moduleSpecifier.startsWith(".")) {
    verifyRelativeImport(sourceFile, moduleSpecifier, violations);
    return;
  }

  const alias = Object.keys(MODULE_ALIASES).find(
    (candidate) => moduleSpecifier === candidate || moduleSpecifier.startsWith(`${candidate}/`),
  );
  if (!alias) {
    return;
  }

  const sourceBoundary = boundaryFor(sourceFile);
  const aliasedPath = moduleSpecifier.slice(alias.length + 1);
  const targetPath = `${MODULE_ALIASES[alias]}/${aliasedPath}`;
  const targetBoundary = boundaryFor(targetPath);

  if (
    (alias === "@features" || alias === "@components") &&
    sourceBoundary !== targetBoundary &&
    aliasedPath.split("/").length > 1
  ) {
    violations.push(
      `${sourceFile} must import ${targetBoundary} through its public entrypoint, ` +
        `not ${moduleSpecifier}`,
    );
  }
}

function verifyRelativeImport(sourceFile, moduleSpecifier, violations) {
  const targetPath = toPosix(join(dirname(sourceFile), moduleSpecifier));
  const sourceBoundary = boundaryFor(sourceFile);
  const targetBoundary = boundaryFor(targetPath);

  if (sourceBoundary !== targetBoundary) {
    violations.push(
      `${sourceFile} crosses from ${sourceBoundary} to ${targetBoundary} with relative import ` +
        `${moduleSpecifier}; use an alias`,
    );
  }
}

function verifyRouteComposition(relativeFile, sourceText, violations) {
  const declaredComponents = [];

  const declarationPatterns = [
    /(?:^|\n)\s*(export\s+(?:default\s+)?)?function\s+([A-Z][A-Za-z0-9]*)\s*\(/g,
    /(?:^|\n)\s*(export\s+)?const\s+([A-Z][A-Za-z0-9]*)\s*(?::[^=\n]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=>/g,
    /(?:^|\n)\s*(export\s+(?:default\s+)?)?class\s+([A-Z][A-Za-z0-9]*)\b/g,
  ];

  for (const pattern of declarationPatterns) {
    for (const match of sourceText.matchAll(pattern)) {
      if (match[2] && isPascalCase(match[2])) {
        declaredComponents.push({ name: match[2], exported: Boolean(match[1]) });
      }
    }
  }

  for (const component of declaredComponents) {
    if (!component.exported || !component.name.endsWith("Route")) {
      violations.push(
        `${relativeFile} declares ${component.name}; route files may declare only exported ` +
          "*Route composition components",
      );
    }
  }

  if (declaredComponents.length > 1) {
    violations.push(
      `${relativeFile} declares ${declaredComponents.length} components; move UI pieces to a ` +
        "feature or shared component module",
    );
  }
}

function isPascalCase(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name) && !/^[A-Z0-9_]+$/.test(name);
}

function boundaryFor(relativePath) {
  const segments = toPosix(relativePath).split("/");
  if (segments[0] === "features" || segments[0] === "components") {
    return `${segments[0]}/${segments[1] ?? "<root>"}`;
  }
  return segments[0] ?? "<root>";
}

function toPosix(path) {
  return path.split(sep).join("/");
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  const sourceRoot = resolve(dirname(currentFile), "../src");
  try {
    await verifyModuleBoundaries(sourceRoot);
    console.log("LifeOS frontend module boundaries valid.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
