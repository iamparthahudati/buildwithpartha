import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const composeDirectory = path.resolve(testDirectory, "..");
const lifeOsRoot = path.resolve(composeDirectory, "../..");

const compose = await readFile(
  path.join(composeDirectory, "compose.local.yml"),
  "utf8",
);
const roleInitializer = await readFile(
  path.join(lifeOsRoot, "infra/postgres/init/001-create-local-app-role.sh"),
  "utf8",
);

test("local PostgreSQL is versioned, private, persistent and health checked", () => {
  assert.match(compose, /^name: life-os-local$/m);
  assert.match(compose, /image: postgres:18\.4-alpine3\.24/);
  assert.doesNotMatch(
    compose,
    /^\s*image:\s+postgres:(?:latest|18|18-alpine)\s*$/m,
  );
  assert.match(compose, /127\.0\.0\.1:\$\{LIFEOS_POSTGRES_PORT:-55432\}:5432/);
  assert.match(compose, /pg_isready/);
  assert.match(compose, /life_os_postgres_data:\/var\/lib\/postgresql/);
  assert.match(compose, /name: life-os-local-postgres-data/);
  assert.match(compose, /life_os_private:[\s\S]*internal: true/);
});

test("local API role is separate from the PostgreSQL admin role", () => {
  assert.match(compose, /POSTGRES_USER:.*lifeos_local_admin/);
  assert.match(compose, /LIFEOS_MIGRATOR_USERNAME:.*lifeos_local_migrator/);
  assert.match(compose, /LIFEOS_APP_USERNAME:.*lifeos_local_app/);
  assert.match(roleInitializer, /NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION/);
  assert.match(roleInitializer, /CREATE SCHEMA IF NOT EXISTS lifeos_internal/);
  assert.match(roleInitializer, /GRANT USAGE ON SCHEMA public/);
  assert.match(roleInitializer, /ALTER DEFAULT PRIVILEGES/);
});
