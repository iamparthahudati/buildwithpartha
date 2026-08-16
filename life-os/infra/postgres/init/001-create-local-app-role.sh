#!/usr/bin/env sh

set -eu

psql \
  --set=ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=lifeos_app_username="$LIFEOS_APP_USERNAME" \
  --set=lifeos_app_password="$LIFEOS_APP_PASSWORD" <<'SQL'
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'lifeos_app_username',
  :'lifeos_app_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = :'lifeos_app_username'
) \gexec

SELECT format(
  'GRANT CONNECT, TEMPORARY ON DATABASE %I TO %I',
  current_database(),
  :'lifeos_app_username'
) \gexec

SELECT format(
  'GRANT USAGE, CREATE ON SCHEMA public TO %I',
  :'lifeos_app_username'
) \gexec
SQL
