#!/usr/bin/env sh

# Generate the LifeOS production secrets file for the SHARED-VPS deployment.
#
# Writes /etc/life-os/secrets/.env.production (dir 0700, file 0600) with every
# key the API startup validator (LifeOsEnvironmentValidator) and the postgres
# container require. Secret values are generated here and never printed.
#
# Safe to re-run only with --force (refuses to clobber an existing file so a
# running database's password is never silently rotated out from under it).
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
  echo "        (Overwriting rotates the DB password; the existing postgres volume would reject it.)" >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "[ERROR] openssl is required to generate secrets." >&2
  exit 1
fi

# One DB password, shared by the app role, Flyway, and the postgres superuser.
DB_PASSWORD="$(openssl rand -base64 30 | tr -d '/+=' | cut -c1-32)"

umask 077
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

cat > "$SECRETS_FILE" <<EOF
# LifeOS production secrets — generated $(date -u +%Y-%m-%dT%H:%M:%SZ)
# DO NOT commit. Permissions must stay 0600.

# --- Spring / server ---
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080

# --- PostgreSQL container bootstrap (postgres:18.4-alpine) ---
POSTGRES_USER=lifeos_app
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=lifeos_prod

# --- API database connection ---
DATABASE_URL=jdbc:postgresql://lifeos-postgres:5432/lifeos_prod
DATABASE_USERNAME=lifeos_app
DATABASE_PASSWORD=$DB_PASSWORD

# --- Flyway (reuses the app role for the first stand-up) ---
FLYWAY_DATABASE_URL=jdbc:postgresql://lifeos-postgres:5432/lifeos_prod
FLYWAY_DATABASE_USERNAME=lifeos_app
FLYWAY_DATABASE_PASSWORD=$DB_PASSWORD

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

echo "[OK] Wrote $SECRETS_FILE (0600) with a freshly generated DB password."
echo "[OK] Keys written: SPRING_PROFILES_ACTIVE, SERVER_PORT, POSTGRES_{USER,PASSWORD,DB},"
echo "     DATABASE_{URL,USERNAME,PASSWORD}, FLYWAY_DATABASE_{URL,USERNAME,PASSWORD},"
echo "     APP_PUBLIC_URL, APP_SESSION_COOKIE_SECURE, APP_MAIL_FROM, SMTP_{HOST,PORT,USERNAME,PASSWORD}."
echo "[NOTE] SMTP is a placeholder ($SMTP_HOST:$SMTP_PORT). Set --smtp-host/--smtp-port for real mail."
