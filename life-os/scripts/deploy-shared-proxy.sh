#!/usr/bin/env sh

# One-shot LifeOS stand-up on the SHARED VPS (behind the existing caddy-docker-proxy).
#
# Safe by construction:
#   * set -e: a failed image build aborts BEFORE any live routing change.
#   * Records the homepage status before touching anything.
#   * After `up`, if the live homepage regressed, it automatically rolls back
#     (`down`) so the marketing site + rntoolbox are never left broken.
#
# Run from /opt/lifeos on the VPS (as root):
#   sh life-os/scripts/deploy-shared-proxy.sh

set -eu

COMPOSE="life-os/infra/compose/compose.prod.shared-proxy.yml"
REPO="/opt/lifeos"
HOME_URL="https://buildwithpartha.tech/"
LIFEOS_URL="https://buildwithpartha.tech/life-os/"
# /actuator/health is auth-gated (401); liveness is the public readiness signal.
HEALTH_URL="https://buildwithpartha.tech/life-os/api/v1/actuator/health/liveness"

cd "$REPO"

status() { curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$1" 2>/dev/null || echo 000; }
# Body byte count — a 200 with an EMPTY body means the route was shadowed, so
# checking status alone is not enough to prove the homepage is really serving.
bytes()  { curl -s --max-time 10 "$1" 2>/dev/null | wc -c | tr -d ' '; }

echo "[*] Baseline homepage status + size (must be preserved)..."
HOME_BEFORE="$(status "$HOME_URL")"
HOME_BEFORE_BYTES="$(bytes "$HOME_URL")"
echo "    homepage before: $HOME_BEFORE (${HOME_BEFORE_BYTES} bytes)"

echo "[*] Ensuring production secrets exist..."
if [ ! -f /etc/life-os/secrets/.env.production ]; then
  sh life-os/scripts/generate-production-secrets.sh
else
  echo "    secrets already present — keeping existing DB password."
fi

echo "[*] Building images (Gradle + Vite; can take several minutes)..."
docker compose -f "$COMPOSE" build

echo "[*] Starting stack (postgres -> api[flyway] -> web)..."
docker compose -f "$COMPOSE" up -d

echo "[*] Waiting for API health (up to ~3 min)..."
API_OK=0
i=0
while [ "$i" -lt 36 ]; do
  if curl -fsS --max-time 10 "$HEALTH_URL" 2>/dev/null | grep -q '"status":"UP"'; then
    API_OK=1; break
  fi
  i=$((i + 1)); sleep 5
done

HOME_AFTER="$(status "$HOME_URL")"
HOME_AFTER_BYTES="$(bytes "$HOME_URL")"
LIFEOS_AFTER="$(status "$LIFEOS_URL")"

echo "-------------------- RESULTS --------------------"
echo "  homepage:      $HOME_AFTER (${HOME_AFTER_BYTES} bytes; was $HOME_BEFORE / ${HOME_BEFORE_BYTES}b)"
echo "  /life-os/:     $LIFEOS_AFTER"
echo "  api health UP: $API_OK"
echo "-------------------------------------------------"

# Homepage is OK only if it returns 2xx/3xx AND still serves a real body
# (>=500 bytes and not collapsed to a fraction of its baseline size).
HOME_OK=0
case "$HOME_AFTER" in
  2*|3*)
    if [ "${HOME_AFTER_BYTES:-0}" -ge 500 ] && [ "${HOME_AFTER_BYTES:-0}" -ge $(( HOME_BEFORE_BYTES / 2 )) ]; then
      HOME_OK=1
    fi
    ;;
esac

if [ "$HOME_OK" -ne 1 ]; then
  echo "[!] Homepage regressed ($HOME_BEFORE/${HOME_BEFORE_BYTES}b -> $HOME_AFTER/${HOME_AFTER_BYTES}b). Rolling back to protect live sites."
  docker compose -f "$COMPOSE" down
  echo "[!] Rolled back. Marketing site + rntoolbox restored. Do not retry until the cause is found."
  exit 1
fi

if [ "$API_OK" -ne 1 ]; then
  echo "[!] LifeOS API not healthy yet, but the homepage is unaffected — leaving containers UP for diagnosis."
  echo "    Inspect: docker compose -f $COMPOSE logs --tail=120 api"
  echo "    Roll back if desired: docker compose -f $COMPOSE down"
  exit 2
fi

echo "[SUCCESS] LifeOS is live at https://buildwithpartha.tech/life-os/  (homepage preserved: $HOME_AFTER)"
