import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const lifeOsRoot = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(lifeOsRoot, "..");

const read = (relativePath) =>
  readFile(path.join(repositoryRoot, relativePath), "utf8");

const webManifestPath = "life-os/apps/web/package.json";
const webLockPath = "life-os/apps/web/package-lock.json";
const apiBuildPath = "life-os/apps/api/build.gradle.kts";
const apiLockPath = "life-os/apps/api/gradle.lockfile";
const wrapperPath =
  "life-os/apps/api/gradle/wrapper/gradle-wrapper.properties";
const dependabotPath = ".github/dependabot.yml";
const localComposePath = "life-os/infra/compose/compose.local.yml";

const exactSemver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const errors = [];

const manifest = JSON.parse(await read(webManifestPath));
const lock = JSON.parse(await read(webLockPath));
const directDependencies = {
  ...manifest.dependencies,
  ...manifest.devDependencies,
};

for (const [name, version] of Object.entries(directDependencies)) {
  if (!exactSemver.test(version)) {
    errors.push(`${webManifestPath}: ${name} must use an exact version.`);
  }

  const lockedVersion = lock.packages?.[`node_modules/${name}`]?.version;
  if (lockedVersion !== version) {
    errors.push(
      `${webLockPath}: ${name} is ${lockedVersion ?? "missing"}; expected ${version}.`,
    );
  }
}

if (lock.lockfileVersion !== 3) {
  errors.push(`${webLockPath}: lockfileVersion must be 3.`);
}

if (!/^npm@\d+\.\d+\.\d+$/.test(manifest.packageManager ?? "")) {
  errors.push(`${webManifestPath}: packageManager must pin an exact npm version.`);
}

const apiBuild = await read(apiBuildPath);
for (const requiredText of [
  "lockAllConfigurations()",
  "LockMode.STRICT",
  'tasks.register("resolveAndLockAll")',
]) {
  if (!apiBuild.includes(requiredText)) {
    errors.push(`${apiBuildPath}: missing ${requiredText}.`);
  }
}

const apiLock = await read(apiLockPath);
if (!apiLock.includes("org.springframework.boot:spring-boot:")) {
  errors.push(`${apiLockPath}: Spring Boot dependency graph is not locked.`);
}
if (!apiLock.includes("org.postgresql:postgresql:")) {
  errors.push(`${apiLockPath}: PostgreSQL driver is not locked.`);
}

const wrapper = await read(wrapperPath);
if (!/distributionUrl=.*gradle-\d+\.\d+(?:\.\d+)?-bin\.zip/.test(wrapper)) {
  errors.push(`${wrapperPath}: Gradle distribution version is not pinned.`);
}
if (!/^distributionSha256Sum=[a-f0-9]{64}$/m.test(wrapper)) {
  errors.push(`${wrapperPath}: official Gradle distribution checksum is required.`);
}

const dependabot = await read(dependabotPath);
for (const requiredText of [
  'package-ecosystem: "npm"',
  'directory: "/life-os/apps/web"',
  'package-ecosystem: "gradle"',
  'directory: "/life-os/apps/api"',
  'package-ecosystem: "docker"',
  'directory: "/life-os/infra/compose"',
  'target-branch: "develop"',
  'interval: "weekly"',
]) {
  if (!dependabot.includes(requiredText)) {
    errors.push(`${dependabotPath}: missing ${requiredText}.`);
  }
}

const localCompose = await read(localComposePath);
if (
  !/^\s*image:\s+postgres:\d+\.\d+-(?:alpine\d+\.\d+|bookworm|trixie)\s*$/m.test(
    localCompose,
  )
) {
  errors.push(`${localComposePath}: PostgreSQL image must use an exact patch/base tag.`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `LifeOS dependency locks valid: ${Object.keys(directDependencies).length} direct web packages, npm lockfile v3, strict Gradle lock, checksummed wrapper, exact PostgreSQL image, weekly update proposals.`,
  );
}
