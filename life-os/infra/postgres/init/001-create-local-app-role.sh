#!/usr/bin/env sh

set -eu

psql \
  --set=ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=lifeos_migrator_username="$LIFEOS_MIGRATOR_USERNAME" \
  --set=lifeos_migrator_password="$LIFEOS_MIGRATOR_PASSWORD" \
  --set=lifeos_app_username="$LIFEOS_APP_USERNAME" \
  --set=lifeos_app_password="$LIFEOS_APP_PASSWORD" <<'SQL'
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'lifeos_migrator_username',
  :'lifeos_migrator_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = :'lifeos_migrator_username'
) \gexec

SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'lifeos_app_username',
  :'lifeos_app_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = :'lifeos_app_username'
) \gexec

SELECT format(
  'GRANT CONNECT, CREATE, TEMPORARY ON DATABASE %I TO %I',
  current_database(),
  :'lifeos_migrator_username'
) \gexec

SELECT format(
  'GRANT USAGE, CREATE ON SCHEMA public TO %I',
  :'lifeos_migrator_username'
) \gexec

SELECT format(
  'CREATE SCHEMA IF NOT EXISTS lifeos_internal AUTHORIZATION %I',
  :'lifeos_migrator_username'
) \gexec

SELECT format(
  'GRANT CONNECT ON DATABASE %I TO %I',
  current_database(),
  :'lifeos_app_username'
) \gexec

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

SELECT format(
  'GRANT USAGE ON SCHEMA public TO %I',
  :'lifeos_app_username'
) \gexec

SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
  :'lifeos_migrator_username',
  :'lifeos_app_username'
) \gexec

SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO %I',
  :'lifeos_migrator_username',
  :'lifeos_app_username'
) \gexec
SQL
