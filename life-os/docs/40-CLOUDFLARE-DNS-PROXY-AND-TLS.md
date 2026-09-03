# LifeOS Cloudflare DNS, proxy, TLS, and WAF specification

- Status: Accepted
- Date: 2026-09-03
- Ticket: [LOS-1606](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md)
- Depends on: [LOS-1601](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/35-VPS-INVENTORY-AND-HARDENING.md), [LOS-1602](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/36-PRODUCTION-CONFIGURATION-AND-SECRETS.md), [LOS-1604](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/38-PRODUCTION-COMPOSE-AND-CADDY.md), [LOS-1605](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/39-STAGING-ENVIRONMENT.md)

---

## 1. Executive summary & architectural scope

This specification defines the canonical Cloudflare DNS, edge proxying, SSL/TLS encryption mode, cache bypass matrix, Web Application Firewall (WAF) rate rules, and host firewall origin restriction strategy for LifeOS.

In accordance with [ADR-011](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-011-MAIN-SITE-LIFEOS-BOUNDARY.md), [docs/35-VPS-INVENTORY-AND-HARDENING.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/35-VPS-INVENTORY-AND-HARDENING.md), [docs/38-PRODUCTION-COMPOSE-AND-CADDY.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/38-PRODUCTION-COMPOSE-AND-CADDY.md), and [docs/39-STAGING-ENVIRONMENT.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/39-STAGING-ENVIRONMENT.md), Cloudflare functions as the single authoritative public edge gateway, providing DNS resolution, DDoS protection, edge TLS termination, WAF security filtering, asset caching, and origin identity protection for `buildwithpartha.tech` (production) and `staging.buildwithpartha.tech` (staging).

This document establishes the Cloudflare declarative ruleset definition (`life-os/infra/cloudflare/cloudflare-ruleset.json`), origin host UFW restriction script (`life-os/infra/cloudflare/configure-cloudflare-origin-firewall.sh`), and automated compliance verification contract (`life-os/scripts/validate-cloudflare-configuration.sh`).

---

## 2. DNS configuration & proxying architecture

All public domain records for `buildwithpartha.tech` and subdomains are managed within Cloudflare DNS. Every web traffic record is configured in **Proxied** mode (Orange Cloud enabled), routing client traffic through Cloudflare's global edge network before reaching the VPS origin host (`srv1883798.hstgr.cloud`).

### Canonical DNS Records Table:

| Hostname / Record | Type | Target / Value | Proxy Status | Description & Target Service |
| --- | --- | --- | --- | --- |
| `buildwithpartha.tech` | `A` | `147.93.107.135` | Proxied | Production root website & LifeOS SPA (`/life-os`). |
| `www.buildwithpartha.tech` | `CNAME` | `buildwithpartha.tech` | Proxied | Production canonical alias redirecting to apex domain. |
| `staging.buildwithpartha.tech` | `A` | `147.93.107.135` | Proxied | Staging environment for LifeOS (`/life-os`). |
| `_acme-challenge` | `TXT` | (Managed by Cloudflare) | DNS Only | DNS-01 challenge verification fallback if needed. |

### DNS & Proxy Protection Rules:
1. **Hidden Origin IP**: The public DNS returns Cloudflare edge IP addresses (e.g., `104.21.x.x` or `172.67.x.x`) to clients. The true VPS origin IP (`147.93.107.135`) is strictly hidden from public DNS queries.
2. **DNSSEC Enabled**: Domain DNSSEC is enabled to prevent DNS spoofing and cache poisoning attacks.
3. **Always Use HTTPS**: Automatic HTTP-to-HTTPS 301 redirects are enforced at the Cloudflare edge before reaching the origin proxy.

---

## 3. SSL/TLS encryption mode & Cloudflare Origin CA certificate strategy

To guarantee end-to-end security and prevent Man-In-The-Middle (MITM) attacks between Cloudflare's edge servers and the Hostinger VPS origin, Cloudflare TLS encryption mode MUST be configured to **Full (strict)**.

```
+---------------+     HTTPS (TLS 1.3)     +-------------------+     HTTPS (TLS 1.3)     +------------------+
| Client / User | ----------------------> |  Cloudflare Edge  | ----------------------> | Host VPS (Caddy) |
|   Browser     |   Public Edge Cert      |   Proxy Network   |   Cloudflare Origin CA  |  Origin Proxy    |
+---------------+                         +-------------------+     Certificate         +------------------+
```

### Encryption & Certificate Controls:
1. **SSL/TLS Mode**: Enforced as `Full (strict)`.
   - `Off`, `Flexible` (unencrypted origin), or standard `Full` (self-signed unvalidated) modes are strictly prohibited.
2. **Minimum TLS Version**: Enforced as `TLS 1.2` (with `TLS 1.3` preferred).
3. **Cloudflare Origin CA Certificate**:
   - A 15-year Cloudflare Origin CA certificate is generated for `buildwithpartha.tech` and `*.buildwithpartha.tech`.
   - Installed at `/etc/life-os/certs/origin.crt` and `/etc/life-os/certs/origin.key` on the VPS host, mounted read-only into the Caddy edge container (`caddy` / `caddy-staging`).
4. **Authenticated Origin Pulls (TLS Client Auth)**:
   - Cloudflare Authenticated Origin Pulls (AOP) mTLS certificate is configured on Caddy to validate that origin requests originate exclusively from authentic Cloudflare edge proxy nodes.
5. **HSTS Enforcement**:
   - HTTP Strict Transport Security (`max-age=31536000; includeSubDomains; preload`) enforced at Cloudflare edge and proxied to Caddy response headers.

---

## 4. Page rules, cache policies & cache bypass matrix

Dynamic API endpoints, authentication flows, user-private application data, and staging environments MUST bypass edge caching to protect sensitive user state and prevent cross-user data leakage.

### Cache Policy Matrix:

| Route Path / Pattern | Edge Cache Action | TTL / Cache Headers | Rationale & Security Contract |
| --- | --- | --- | --- |
| `/life-os/api/*` | **Bypass Cache** | `Cache-Control: no-store, private` | REST API endpoints serving dynamic user data. Edge caching causes security leaks. |
| `/api/*` | **Bypass Cache** | `Cache-Control: no-store, private` | API endpoints alias boundary. |
| `/life-os/app/*` | **Bypass Cache** | `Cache-Control: no-store, private` | Authenticated SPA application routes and session-dependent views. |
| `staging.buildwithpartha.tech/*` | **Bypass Cache** | `Cache-Control: no-store, private` | Staging environment must always reflect immediate deployments and test updates. |
| `/life-os/assets/*` | **Cache Everything** | Browser: 1 year, Edge: 30 days | Static compiled React frontend JS, CSS, fonts, and images (content-hashed filenames). |
| `/assets/*` | **Cache Everything** | Browser: 1 year, Edge: 30 days | Main site compiled assets. |
| `/` | **Eligible for Cache** | Edge: 2 hours, Revalidate | Root static homepage HTML. |

### Header & Cookie Cache Bypass Triggers:
Cloudflare Cache Rules automatically bypass edge cache whenever any of the following headers or cookies are present:
1. **Authorization Header**: `Authorization: Bearer *`.
2. **Session Cookies**: `lifeos_session`, `lifeos_staging_session`, `JSESSIONID`.
3. **No-Store Directives**: Response header contains `no-store`, `no-cache`, or `private`.

---

## 5. Web Application Firewall (WAF), rate limiting & bot mitigation

Cloudflare WAF rules protect the VPS origin host from automated abuse, credential stuffing, brute force attacks, and known web vulnerabilities.

### 1. Rate Limiting Rules (Authentication & Sensitive Endpoints):
- **Target Route**: `/life-os/api/v1/auth/*` (Login, Register, Password Reset, Token Refresh).
- **Threshold**: Maximum **10 requests per minute** per client IP address.
- **Action**: Block / HTTP 429 (Too Many Requests) for 15 minutes upon threshold breach.

### 2. General API Rate Limiting:
- **Target Route**: `/life-os/api/*`.
- **Threshold**: Maximum **120 requests per minute** per client IP address.
- **Action**: Challenge (Cloudflare Turnstile / Managed Challenge).

### 3. WAF Managed & Custom Security Rules:
- **Cloudflare Managed Ruleset**: Enabled (OWASP Core Ruleset, Cloudflare Vulnerability Rules).
- **Bot Management / Bot Fight Mode**: Enabled. Block known malicious bots and automated scrapers.
- **Geographic Filtering**: Challenge traffic from regions with zero legitimate user presence if anomaly spikes occur.
- **Security Level**: Set to `Medium` (Production) and `High` (Staging).

---

## 6. Direct origin bypass prevention & VPS host UFW firewall restriction

Even with Cloudflare DNS proxied, an attacker who discovers the origin VPS IP address (`147.93.107.135`) could bypass Cloudflare WAF, rate limits, and TLS policies by connecting directly to the host on HTTP/HTTPS ports (80/443).

To prevent direct origin bypass, the Hostinger VPS host Uncomplicated Firewall (UFW) MUST restrict incoming connections on ports `80` and `443` strictly to Cloudflare's published IP ranges.

### Direct Origin Bypass Prevention Architecture:

```
                              +---------------------------------------+
                              |         Public Internet Traffic       |
                              +-------------------+-------------------+
                                                  |
                     +----------------------------+----------------------------+
                     |                                                         |
                     v (Direct IP Connect attempt: 147.93.107.135)             v (Proxied via Cloudflare)
       +-------------------------------------------+             +-------------------------------------------+
       |   Host UFW Firewall (Non-Cloudflare IP)    |             |    Host UFW Firewall (Cloudflare IP)      |
       |   Rule: DROP / DENY 80,443 inbound            |             |    Rule: ALLOW 80,443 inbound             |
       +---------------------+---------------------+             +---------------------+---------------------+
                             |                                                         |
                             v                                                         v
                 [ Connection Dropped ]                                   [ Forwarded to Caddy Proxy ]
```

### Official Cloudflare Published IP Ranges:
- **IPv4**: `https://www.cloudflare.com/ips-v4`
  - `173.245.48.0/20`, `103.21.244.0/22`, `103.22.200.0/22`, `103.31.4.0/22`, `141.101.64.0/18`, `108.162.192.0/18`, `190.93.240.0/20`, `188.114.96.0/20`, `197.234.240.0/22`, `198.41.128.0/17`, `162.158.0.0/15`, `104.16.0.0/13`, `104.24.0.0/14`, `172.64.0.0/13`, `131.0.72.0/22`
- **IPv6**: `https://www.cloudflare.com/ips-v6`
  - `2400:cb00::/32`, `2606:4700::/32`, `2803:f800::/32`, `2405:b500::/32`, `2405:8100::/32`, `2a06:98c0::/29`, `2c0f:f248::/32`

### UFW Ruleset Contract on Origin Host:
1. **Default Policies**: `ufw default deny incoming`, `ufw default allow outgoing`.
2. **SSH Administrative Access**: `ufw allow 22/tcp` (restricted to SSH key auth per [docs/35-VPS-INVENTORY-AND-HARDENING.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/35-VPS-INVENTORY-AND-HARDENING.md)).
3. **HTTP/HTTPS Origin Gate**:
   - For every subnet `IP` in Cloudflare IPv4 & IPv6 list: `ufw allow from <IP> to any port 80,443 proto tcp`.
   - Direct inbound port 80/443 access from non-Cloudflare IP addresses is automatically rejected by the default deny rule.
4. **Automated Origin Firewall Script**: Implemented via `life-os/infra/cloudflare/configure-cloudflare-origin-firewall.sh`.

---

## 7. Automated verification & compliance audit contract

Compliance with Cloudflare DNS, TLS Full (strict), Cache bypass matrix, WAF rate rules, and origin restriction is validated via automated checks:

1. **Declarative Ruleset Audit**: `life-os/infra/cloudflare/cloudflare-ruleset.json` declares all required Cloudflare settings.
2. **Origin Firewall Audit Script**: `life-os/infra/cloudflare/configure-cloudflare-origin-firewall.sh` supports `--dry-run` to verify UFW rule generation without mutating active host firewall state.
3. **Continuous Verification Tool**: Executing `sh life-os/scripts/validate-cloudflare-configuration.sh --dry-run` checks:
   - Validity of Cloudflare ruleset JSON and UFW script executable permissions.
   - Compliance of specification document `40-CLOUDFLARE-DNS-PROXY-AND-TLS.md`.
   - Caddy real-IP and header proxy trust configuration in `Caddyfile.prod` and `Caddyfile.staging`.
   - Zero direct origin bypass accessibility requirements.
