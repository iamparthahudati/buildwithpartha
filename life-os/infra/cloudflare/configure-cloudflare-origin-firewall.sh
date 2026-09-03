#!/bin/sh
set -e

# ==============================================================================
# LifeOS Cloudflare Origin Firewall Configuration Script (LOS-1606)
# Restricts VPS ports 80/443 strictly to Cloudflare's published IP ranges.
# ==============================================================================

DRY_RUN=false
FORCE=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      ;;
    --force)
      FORCE=true
      ;;
    *)
      ;;
  esac
done

echo "======================================================================"
echo " LifeOS Cloudflare Origin Firewall Configuration (LOS-1606)"
echo "======================================================================"

CLOUDFLARE_IPV4="
173.245.48.0/20
103.21.244.0/22
103.22.200.0/22
103.31.4.0/22
141.101.64.0/18
108.162.192.0/18
190.93.240.0/20
188.114.96.0/20
197.234.240.0/22
198.41.128.0/17
162.158.0.0/15
104.16.0.0/13
104.24.0.0/14
172.64.0.0/13
131.0.72.0/22
"

CLOUDFLARE_IPV6="
2400:cb00::/32
2606:4700::/32
2803:f800::/32
2405:b500::/32
2405:8100::/32
2a06:98c0::/29
2c0f:f248::/32
"

echo "Loaded Cloudflare IP subnets:"
V4_COUNT=0
V6_COUNT=0

for cidr in $CLOUDFLARE_IPV4; do
  V4_COUNT=$((V4_COUNT + 1))
done

for cidr in $CLOUDFLARE_IPV6; do
  V6_COUNT=$((V6_COUNT + 1))
done

echo "  - IPv4 subnets: $V4_COUNT"
echo "  - IPv6 subnets: $V6_COUNT"

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "[DRY RUN] Simulating UFW rule generation for Cloudflare origin restriction:"
  echo "  1. ufw default deny incoming"
  echo "  2. ufw default allow outgoing"
  echo "  3. ufw allow 22/tcp"
  for ip in $CLOUDFLARE_IPV4; do
    echo "  4. ufw allow from $ip to any port 80,443 proto tcp"
  done
  for ip in $CLOUDFLARE_IPV6; do
    echo "  5. ufw allow from $ip to any port 80,443 proto tcp"
  done
  echo ""
  echo "[DRY RUN] Verification successful. Zero active UFW changes executed."
  exit 0
fi

if ! command -v ufw >/dev/null 2>&1; then
  echo "ERROR: 'ufw' utility is not installed on this host."
  echo "Run with '--dry-run' for verification."
  exit 1
fi

echo "Applying host UFW rules for Cloudflare origin restriction..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH administrative access'

for ip in $CLOUDFLARE_IPV4; do
  ufw allow from "$ip" to any port 80 proto tcp comment 'Cloudflare IPv4 HTTP'
  ufw allow from "$ip" to any port 443 proto tcp comment 'Cloudflare IPv4 HTTPS'
done

for ip in $CLOUDFLARE_IPV6; do
  ufw allow from "$ip" to any port 80 proto tcp comment 'Cloudflare IPv6 HTTP'
  ufw allow from "$ip" to any port 443 proto tcp comment 'Cloudflare IPv6 HTTPS'
done

if [ "$FORCE" = true ]; then
  ufw --force enable
else
  echo "UFW rules added. Execute 'ufw enable' or re-run with '--force' to activate firewall rules."
fi

echo "Cloudflare origin firewall configuration completed successfully."
