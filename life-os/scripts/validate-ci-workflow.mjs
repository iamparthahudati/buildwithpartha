import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const workflowPath = join(repositoryRoot, ".github/workflows/lifeos-ci.yml");
const protectionScriptPath = join(
  repositoryRoot,
  "life-os/scripts/configure-branch-protection.sh",
);
const workflow = await readFile(workflowPath, "utf8");
const protectionScript = await readFile(protectionScriptPath, "utf8");

const requiredChecks = [
  "LifeOS / Documentation",
  "LifeOS / Frontend",
  "LifeOS / Backend",
  "LifeOS / Secret scan",
];
const failures = [];

for (const check of requiredChecks) {
  if (!workflow.includes(`name: ${check}`)) {
    failures.push(`Workflow is missing required check: ${check}`);
  }
  if (!protectionScript.includes(`\"${check}\"`)) {
    failures.push(`Branch-protection script is missing required check: ${check}`);
  }
}

for (const match of workflow.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)) {
  const action = match[1];
  if (!action || !/@[a-f0-9]{40}$/.test(action)) {
    failures.push(`Action must be pinned to a full commit SHA: ${action ?? "unknown"}`);
  }
}

const requiredFragments = [
  "pull_request:",
  "push:",
  "workflow_dispatch:",
  "permissions:\n  contents: read",
  "cancel-in-progress: true",
  "npm ci --ignore-scripts",
  "./gradlew clean build --no-daemon",
  "name: life-os-openapi",
  "life-os/apps/api/build/openapi/life-os-openapi.json",
  "if-no-files-found: error",
  "GITLEAKS_ENABLE_COMMENTS: \"false\"",
];

for (const fragment of requiredFragments) {
  if (!workflow.includes(fragment)) {
    failures.push(`Workflow is missing policy fragment: ${fragment}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `LifeOS CI policy valid: ${requiredChecks.length} required checks and immutable action pins.`,
);
