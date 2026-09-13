#!/usr/bin/env sh

# Generate the LifeOS production secrets file for the SHARED-VPS deployment.
#
# Writes /etc/life-os/secrets/.env.production (dir 0700, file 0600) with every
# key the API startup validator, Flyway, the postgres container, and the DB init
# script (infra/postgres/init) require. Secret values are generated here and
# never printed.
#
# Role model (matches infra/postgres/init/001-create-local-app-role.sh):
#   * POSTGRES_USER  (lifeos_admin) — bootstrap superuser; runs the init script.
#   * lifeos_migrator — owns schema lifeos_internal; Flyway connects as this.
#   * lifeos_app      — runtime role the API connects as.
#
# Safe to re-run only with --force (refuses to clobber an existing file so a
# running database's passwords are never silently rotated out from under it).
#
# Usage:
#   sh life-os/scripts/generate-production-secrets.sh [--force] \
#       [--smtp-host=HOST] [--smtp-port=PORT] [--mail-from=ADDR]

set -eu

SECRETS_DIR="/etc/life-os/secrets"
SECRETS_FILE="$SECRETS_DIR/.env.production"

FORCE=0
SMTP_HOST="localhost"
SMTP_PORT="25"
MAIL_FROM="lifeos@buildwithpartha.tech"
PUBLIC_URL="https://buildwithpartha.tech/life-os"

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --smtp-host=*) SMTP_HOST="${arg#*=}" ;;
    --smtp-port=*) SMTP_PORT="${arg#*=}" ;;
    --mail-from=*) MAIL_FROM="${arg#*=}" ;;
    *) echo "[ERROR] Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

if [ "$(id -u)" -ne 0 ]; then
  echo "[ERROR] Must run as root (writes under /etc)." >&2
  exit 1
fi

if [ -f "$SECRETS_FILE" ] && [ "$FORCE" -ne 1 ]; then
  echo "[ERROR] $SECRETS_FILE already exists. Refusing to overwrite without --force." >&2
  echo "        (Overwriting rotates DB passwords; the existing postgres volume would reject them.)" >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "[ERROR] openssl is required to generate secrets." >&2
  exit 1
fi

gen() { openssl rand -base64 30 | tr -d '/+=' | cut -c1-32; }

ADMIN_PASSWORD="$(gen)"
MIGRATOR_PASSWORD="$(gen)"
APP_PASSWORD="$(gen)"

umask 077
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

cat > "$SECRETS_FILE" <<EOF
# LifeOS production secrets — generated $(date -u +%Y-%m-%dT%H:%M:%SZ)
# DO NOT commit. Permissions must stay 0600.

# --- Spring / server ---
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080

# --- PostgreSQL container bootstrap (postgres:18-alpine superuser) ---
POSTGRES_USER=lifeos_admin
POSTGRES_PASSWORD=$ADMIN_PASSWORD
POSTGRES_DB=lifeos_prod

# --- Roles created by infra/postgres/init on first DB init ---
LIFEOS_MIGRATOR_USERNAME=lifeos_migrator
LIFEOS_MIGRATOR_PASSWORD=$MIGRATOR_PASSWORD
LIFEOS_APP_USERNAME=lifeos_app
LIFEOS_APP_PASSWORD=$APP_PASSWORD

# --- API runtime database connection (lifeos_app) ---
DATABASE_URL=jdbc:postgresql://lifeos-postgres:5432/lifeos_prod
DATABASE_USERNAME=lifeos_app
DATABASE_PASSWORD=$APP_PASSWORD

# --- Flyway migrations (lifeos_migrator; owns schema lifeos_internal) ---
FLYWAY_DATABASE_URL=jdbc:postgresql://lifeos-postgres:5432/lifeos_prod
FLYWAY_DATABASE_USERNAME=lifeos_migrator
FLYWAY_DATABASE_PASSWORD=$MIGRATOR_PASSWORD

# --- Application ---
APP_PUBLIC_URL=$PUBLIC_URL
APP_SESSION_COOKIE_SECURE=true
APP_MAIL_FROM=$MAIL_FROM

# --- SMTP (placeholder — outbound mail will not work until pointed at a real server) ---
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USERNAME=
SMTP_PASSWORD=
EOF

chmod 600 "$SECRETS_FILE"

echo "[OK] Wrote $SECRETS_FILE (0600) with freshly generated admin/migrator/app passwords."
echo "[NOTE] SMTP is a placeholder ($SMTP_HOST:$SMTP_PORT). Set --smtp-host/--smtp-port for real mail."
