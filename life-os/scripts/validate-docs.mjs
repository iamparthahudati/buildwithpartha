import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const lifeOsRoot = path.join(repoRoot, "life-os");
const failures = [];

function walk(directory, predicate) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(filePath, predicate));
    else if (predicate(filePath)) files.push(filePath);
  }
  return files;
}

const markdownFiles = walk(lifeOsRoot, (filePath) => filePath.endsWith(".md"));

for (const filePath of markdownFiles) {
  const source = fs.readFileSync(filePath, "utf8");
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().split("#")[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const resolved = path.resolve(path.dirname(filePath), decodeURIComponent(target));
    if (!fs.existsSync(resolved)) {
      failures.push(
        `Broken local link in ${path.relative(repoRoot, filePath)}: ${match[1]}`,
      );
    }
  }
}

const epicFiles = walk(path.join(lifeOsRoot, "docs/backlog"), (filePath) =>
  /EPIC-\d+.*\.md$/.test(filePath),
);
const ticketDefinitions = new Map();

for (const filePath of epicFiles) {
  const source = fs.readFileSync(filePath, "utf8");
  for (const match of source.matchAll(/^\| (LOS-\d{4}) \|/gm)) {
    const ticketId = match[1];
    const existing = ticketDefinitions.get(ticketId);
    if (existing) {
      failures.push(
        `Duplicate ticket ${ticketId}: ${path.relative(repoRoot, existing)} and ${path.relative(repoRoot, filePath)}`,
      );
    } else {
      ticketDefinitions.set(ticketId, filePath);
    }
  }
}

if (ticketDefinitions.size === 0) failures.push("No LifeOS ticket definitions found.");

const statusPath = path.join(lifeOsRoot, "docs/backlog/STATUS.md");
const statusSource = fs.readFileSync(statusPath, "utf8");
for (const match of statusSource.matchAll(/^\| (LOS-\d{4}) \|/gm)) {
  if (!ticketDefinitions.has(match[1])) {
    failures.push(`Status ledger references undefined ticket ${match[1]}.`);
  }
}

const statusDateMatch = statusSource.match(/^Last updated: (\d{4}-\d{2}-\d{2})$/m);
if (!statusDateMatch) {
  failures.push("Status ledger must contain 'Last updated: YYYY-MM-DD'.");
} else {
  const updated = new Date(`${statusDateMatch[1]}T00:00:00Z`);
  const ageDays = Math.floor((Date.now() - updated.getTime()) / 86_400_000);
  if (ageDays > 30) {
    failures.push(`Status ledger is stale (${ageDays} days old); update it with the active ticket.`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `LifeOS docs valid: ${markdownFiles.length} Markdown files, ${ticketDefinitions.size} unique tickets, no broken local links.`,
);

