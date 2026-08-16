#!/usr/bin/env sh

set -eu

repository_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
api_directory="$repository_root/life-os/apps/api"
web_directory="$repository_root/life-os/apps/web"
postgres_port="${LIFEOS_GATE_POSTGRES_PORT:-55434}"
api_port="${LIFEOS_GATE_API_PORT:-18080}"
web_port="${LIFEOS_GATE_WEB_PORT:-14173}"
postgres_admin="lifeos_gate_admin"
postgres_database="lifeos_gate"
postgres_migrator="lifeos_gate_migrator"
postgres_migrator_password="lifeos_gate_migrator_only"
postgres_app="lifeos_gate_app"
postgres_app_password="lifeos_gate_app_only"
gate_root=$(mktemp -d "${TMPDIR:-/tmp}/lifeos-foundation-gate.XXXXXX")
postgres_started=0
api_pid=""
web_pid=""

if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
  java_command="$JAVA_HOME/bin/java"
else
  java_command="java"
fi

cleanup() {
  if [ -n "$web_pid" ]; then
    kill "$web_pid" >/dev/null 2>&1 || true
    wait "$web_pid" >/dev/null 2>&1 || true
  fi
  if [ -n "$api_pid" ]; then
    kill "$api_pid" >/dev/null 2>&1 || true
    wait "$api_pid" >/dev/null 2>&1 || true
  fi
  if [ "$postgres_started" -eq 1 ]; then
    pg_ctl -D "$gate_root/postgres" -m fast -w stop >/dev/null
  fi

  case "$gate_root" in
    */lifeos-foundation-gate.*) rm -rf -- "$gate_root" ;;
    *) echo "Refusing to remove unexpected gate directory: $gate_root" >&2 ;;
  esac
}

trap cleanup EXIT INT TERM

for required_command in initdb pg_ctl createdb psql curl lsof npm "$java_command"; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "Required foundation-gate command is unavailable: $required_command" >&2
    exit 1
  fi
done

for port in "$postgres_port" "$api_port" "$web_port"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Foundation-gate port is already in use: $port" >&2
    exit 1
  fi
done

initdb \
  --pgdata="$gate_root/postgres" \
  --username="$postgres_admin" \
  --auth=trust \
  --encoding=UTF8 \
  --no-locale >/dev/null

pg_ctl \
  -D "$gate_root/postgres" \
  -l "$gate_root/postgres.log" \
  -o "-h 127.0.0.1 -p $postgres_port" \
  -w start >/dev/null
postgres_started=1

createdb \
  --host=127.0.0.1 \
  --port="$postgres_port" \
  --username="$postgres_admin" \
  "$postgres_database"

PGHOST=127.0.0.1 \
PGPORT="$postgres_port" \
POSTGRES_USER="$postgres_admin" \
POSTGRES_DB="$postgres_database" \
LIFEOS_MIGRATOR_USERNAME="$postgres_migrator" \
LIFEOS_MIGRATOR_PASSWORD="$postgres_migrator_password" \
LIFEOS_APP_USERNAME="$postgres_app" \
LIFEOS_APP_PASSWORD="$postgres_app_password" \
  "$repository_root/life-os/infra/postgres/init/001-create-local-app-role.sh" >/dev/null

DATABASE_URL="jdbc:postgresql://127.0.0.1:$postgres_port/$postgres_database" \
DATABASE_USERNAME="$postgres_app" \
DATABASE_PASSWORD="$postgres_app_password" \
FLYWAY_DATABASE_URL="jdbc:postgresql://127.0.0.1:$postgres_port/$postgres_database" \
FLYWAY_DATABASE_USERNAME="$postgres_migrator" \
FLYWAY_DATABASE_PASSWORD="$postgres_migrator_password" \
SPRING_PROFILES_ACTIVE=local \
SERVER_PORT="$api_port" \
APP_PUBLIC_URL="http://127.0.0.1:$web_port/life-os" \
APP_SESSION_COOKIE_SECURE=false \
APP_MAIL_FROM=lifeos@example.test \
SMTP_HOST=127.0.0.1 \
SMTP_PORT=1025 \
  "$java_command" -jar "$api_directory/build/libs/life-os-api.jar" \
  >"$gate_root/api.log" 2>&1 &
api_pid=$!

api_health_url="http://127.0.0.1:$api_port/life-os/api/v1/actuator/health/readiness"
attempt=0
until curl --fail --silent "$api_health_url" >"$gate_root/health.json"; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ] || ! kill -0 "$api_pid" >/dev/null 2>&1; then
    echo "LifeOS API did not become ready." >&2
    tail -80 "$gate_root/api.log" >&2
    exit 1
  fi
  sleep 1
done

if ! grep -q '"status":"UP"' "$gate_root/health.json"; then
  echo "LifeOS API readiness response was not UP." >&2
  exit 1
fi

(
  cd "$web_directory"
  VITE_APP_BASE_PATH=/life-os/ \
  VITE_API_BASE_PATH=/life-os/api/v1 \
    ./node_modules/.bin/vite preview --host 127.0.0.1 --port "$web_port"
) >"$gate_root/web.log" 2>&1 &
web_pid=$!

nested_route_url="http://127.0.0.1:$web_port/life-os/app/today"
attempt=0
until curl --fail --silent "$nested_route_url" >"$gate_root/nested-route.html"; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ] || ! kill -0 "$web_pid" >/dev/null 2>&1; then
    echo "LifeOS web preview did not become ready." >&2
    tail -80 "$gate_root/web.log" >&2
    exit 1
  fi
  sleep 1
done

if ! grep -q '<div id="root"></div>' "$gate_root/nested-route.html"; then
  echo "Nested LifeOS route did not return the SPA document." >&2
  exit 1
fi

echo "Foundation stack smoke passed: disposable PostgreSQL, API readiness, and nested web route."
