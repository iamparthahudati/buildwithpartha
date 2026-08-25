#!/usr/bin/env sh

set -eu

test_postgres_port="${LIFEOS_FLYWAY_TEST_PORT:-55433}"
test_postgres_admin="lifeos_flyway_test_admin"
test_postgres_database="lifeos_flyway_test"
test_postgres_migrator="lifeos_flyway_test_migrator"
test_postgres_migrator_password="lifeos_flyway_test_migrator_only"
test_postgres_app="lifeos_flyway_test_app"
test_postgres_app_password="lifeos_flyway_test_app_only"
test_postgres_root=$(mktemp -d "${TMPDIR:-/tmp}/lifeos-flyway-test.XXXXXX")
test_postgres_started=0

if command -v /usr/libexec/java_home >/dev/null 2>&1 && /usr/libexec/java_home -v 21 >/dev/null 2>&1; then
  test_java_command="$(/usr/libexec/java_home -v 21)/bin/java"
elif [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
  test_java_command="$JAVA_HOME/bin/java"
else
  test_java_command="java"
fi

cleanup() {
  if [ "$test_postgres_started" -eq 1 ]; then
    pg_ctl -D "$test_postgres_root/data" -m fast -w stop >/dev/null
  fi

  case "$test_postgres_root" in
    */lifeos-flyway-test.*) rm -rf -- "$test_postgres_root" ;;
    *) echo "Refusing to remove unexpected test directory: $test_postgres_root" >&2 ;;
  esac
}

trap cleanup EXIT INT TERM

for test_command in initdb pg_ctl createdb psql "$test_java_command"; do
  if ! command -v "$test_command" >/dev/null 2>&1; then
    echo "Required command is unavailable: $test_command" >&2
    exit 1
  fi
done

./gradlew bootJar --no-daemon

initdb \
  --pgdata="$test_postgres_root/data" \
  --username="$test_postgres_admin" \
  --auth=trust \
  --encoding=UTF8 \
  --no-locale >/dev/null

pg_ctl \
  -D "$test_postgres_root/data" \
  -l "$test_postgres_root/postgres.log" \
  -o "-h 127.0.0.1 -p $test_postgres_port" \
  -w start >/dev/null
test_postgres_started=1

createdb \
  --host=127.0.0.1 \
  --port="$test_postgres_port" \
  --username="$test_postgres_admin" \
  "$test_postgres_database"

PGHOST=127.0.0.1 \
PGPORT="$test_postgres_port" \
POSTGRES_USER="$test_postgres_admin" \
POSTGRES_DB="$test_postgres_database" \
LIFEOS_MIGRATOR_USERNAME="$test_postgres_migrator" \
LIFEOS_MIGRATOR_PASSWORD="$test_postgres_migrator_password" \
LIFEOS_APP_USERNAME="$test_postgres_app" \
LIFEOS_APP_PASSWORD="$test_postgres_app_password" \
  ../../infra/postgres/init/001-create-local-app-role.sh >/dev/null

run_migration() {
  if ! DATABASE_URL="jdbc:postgresql://127.0.0.1:$test_postgres_port/$test_postgres_database" \
    DATABASE_USERNAME="$test_postgres_app" \
    DATABASE_PASSWORD="$test_postgres_app_password" \
    FLYWAY_DATABASE_URL="jdbc:postgresql://127.0.0.1:$test_postgres_port/$test_postgres_database" \
    FLYWAY_DATABASE_USERNAME="$test_postgres_migrator" \
    FLYWAY_DATABASE_PASSWORD="$test_postgres_migrator_password" \
    SPRING_PROFILES_ACTIVE=postgres-test \
    SPRING_MAIN_BANNER_MODE=off \
    SERVER_PORT=18081 \
    APP_PUBLIC_URL=http://localhost:5173/life-os \
    APP_SESSION_COOKIE_SECURE=false \
    APP_MAIL_FROM=lifeos@example.test \
    SMTP_HOST=localhost \
    SMTP_PORT=1025 \
      "$test_java_command" -jar build/libs/life-os-api.jar \
        >>"$test_postgres_root/application.log" 2>&1; then
    echo "Flyway verification application startup failed." >&2
    tail -80 "$test_postgres_root/application.log" >&2
    return 1
  fi
}

run_migration
run_migration

test_migration_count=$(psql \
  --host=127.0.0.1 \
  --port="$test_postgres_port" \
  --username="$test_postgres_admin" \
  --dbname="$test_postgres_database" \
  --tuples-only \
  --no-align \
  --command="SELECT count(*) FROM lifeos_internal.lifeos_schema_history WHERE version = '1' AND success")

test_extension_count=$(psql \
  --host=127.0.0.1 \
  --port="$test_postgres_port" \
  --username="$test_postgres_admin" \
  --dbname="$test_postgres_database" \
  --tuples-only \
  --no-align \
  --command="SELECT count(*) FROM pg_extension WHERE extname = 'pgcrypto'")

test_product_table_count=$(psql \
  --host=127.0.0.1 \
  --port="$test_postgres_port" \
  --username="$test_postgres_admin" \
  --dbname="$test_postgres_database" \
  --tuples-only \
  --no-align \
  --command="SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")

test_restricted_role_count=$(psql \
  --host=127.0.0.1 \
  --port="$test_postgres_port" \
  --username="$test_postgres_admin" \
  --dbname="$test_postgres_database" \
  --tuples-only \
  --no-align \
  --command="SELECT count(*) FROM pg_roles WHERE rolname IN ('$test_postgres_migrator', '$test_postgres_app') AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication")

test_focus_preference_column_count=$(psql \
  --host=127.0.0.1 \
  --port="$test_postgres_port" \
  --username="$test_postgres_admin" \
  --dbname="$test_postgres_database" \
  --tuples-only \
  --no-align \
  --command="SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_preferences' AND column_name IN ('long_break_duration_minutes', 'focus_sessions_before_long_break', 'auto_start_breaks', 'auto_start_focus_sessions', 'sound_enabled', 'browser_notifications_enabled')")

test_weekly_plan_table_count=$(psql \
  --host=127.0.0.1 \
  --port="$test_postgres_port" \
  --username="$test_postgres_admin" \
  --dbname="$test_postgres_database" \
  --tuples-only \
  --no-align \
  --command="SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('weekly_plans', 'weekly_plan_capacities', 'weekly_plan_outcomes', 'weekly_plan_items')")

test_review_table_count=$(psql \
  --host=127.0.0.1 \
  --port="$test_postgres_port" \
  --username="$test_postgres_admin" \
  --dbname="$test_postgres_database" \
  --tuples-only \
  --no-align \
  --command="SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('reviews', 'review_answers', 'review_item_decisions')")

if [ "$test_migration_count" != "1" ]; then
  echo "Expected exactly one successful V1 migration; found $test_migration_count." >&2
  exit 1
fi

if [ "$test_extension_count" != "1" ]; then
  echo "Expected pgcrypto to be installed exactly once; found $test_extension_count." >&2
  exit 1
fi

if [ "$test_product_table_count" != "37" ]; then
  echo "Expected exactly 37 product tables after V2-V21 migrations; found $test_product_table_count." >&2
  exit 1
fi

if [ "$test_focus_preference_column_count" != "6" ]; then
  echo "Expected six LOS-0916 focus preference columns; found $test_focus_preference_column_count." >&2
  exit 1
fi

if [ "$test_weekly_plan_table_count" != "4" ]; then
  echo "Expected four LOS-1004 Weekly Plan tables; found $test_weekly_plan_table_count." >&2
  exit 1
fi

if [ "$test_review_table_count" != "3" ]; then
  echo "Expected three LOS-1009 Review tables; found $test_review_table_count." >&2
  exit 1
fi

if [ "$test_restricted_role_count" != "2" ]; then
  echo "Expected two restricted migration/application roles; found $test_restricted_role_count." >&2
  exit 1
fi

if psql \
  --host=127.0.0.1 \
  --port="$test_postgres_port" \
  --username="$test_postgres_app" \
  --dbname="$test_postgres_database" \
  --command="SELECT count(*) FROM lifeos_internal.lifeos_schema_history" \
  >/dev/null 2>&1; then
  echo "Application role must not read the private Flyway history schema." >&2
  exit 1
fi

echo "Flyway PostgreSQL verification passed: restricted roles, clean migration and existing-database rerun."
