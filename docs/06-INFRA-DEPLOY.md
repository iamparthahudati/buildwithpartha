# 06 — Infrastructure, Deployment & Launch

How the whole thing runs on one VPS, reproducibly, safely, and how the first release actually goes live.

## What runs where

Everything is containers in **one `docker-compose.prod.yml`** on the VPS, behind **Caddy**, behind **Cloudflare**.

```
Cloudflare (DNS, CDN, TLS edge, WAF, DDoS)
        │  origin reachable ONLY from Cloudflare IPs
        ▼
Caddy  (:443/:80)  — auto-TLS, security headers, gzip/br, path routing
        ├── /        → web    (Next.js container, :3000)
        ├── /api/*   → api    (Spring Boot container, :8080)
        └── /admin/* → admin  (static React build, served by Caddy or a tiny static container)
                          │
                          ▼
                     postgres (:5432, internal network only — never public)
```

## Containers (services)

| Service | Image | Notes |
| --- | --- | --- |
| `web` | Node build → runtime | Next.js production server (or static export if fully SSG). Non-root. |
| `api` | temurin-jre / distroless | The Spring Boot jar. Non-root, read-only FS, resource limits. |
| `admin` | built static assets | Vite build output; served by Caddy directly (no separate server needed). |
| `postgres` | `postgres:16` | Named volume for data; internal network only; strong creds via env. |
| `caddy` | `caddy:2` | The only publicly-listening service; mounts the `Caddyfile` + a certs volume. |

All on a private Docker network; only `caddy` publishes ports (80/443).

## Caddy (the reverse proxy) — responsibilities

- **Automatic HTTPS** via Let's Encrypt (renews itself).
- **Path routing** to `web` / `api` / `admin`.
- **Security headers** applied centrally (doc 4 §Headers): CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors.
- **Compression** (gzip/brotli) and **cache headers** for static assets.
- **Origin lockdown:** trust/allow only Cloudflare IP ranges; use Cloudflare's real-client-IP header for logging/rate limits.

A minimal `Caddyfile` shape (illustrative):

```
buildwithpartha.tech {
    encode zstd gzip
    header { ... security headers ... }

    handle /api/* { reverse_proxy api:8080 }
    handle /admin* { root * /srv/admin; try_files {path} /index.html; file_server }
    handle        { reverse_proxy web:3000 }
}
```

## Cloudflare (in front)

- **DNS** for `buildwithpartha.tech` → VPS, **proxy (orange cloud) ON**.
- **Cache** static assets/pages at the edge (Core Web Vitals + fewer origin hits).
- **WAF + rate rules** on `/api/*` and `/admin`; **Bot Fight** mode; **DDoS** protection (automatic).
- **Full (strict) TLS** to origin (Caddy presents a real cert).
- **Hide origin IP;** lock the VPS firewall to Cloudflare ranges so no one bypasses the edge.
- Optional: **Turnstile** on the newsletter form if spam appears.

## Configuration & secrets (12-factor)

- Every service reads config from **environment variables** — DB creds, mail creds, session secret, admin bootstrap.
- Committed: `infra/.env.example` (keys, no values). Real `infra/.env` is **git-ignored**, lives only on the VPS, `chmod 600`.
- Distinct values per environment; rotate on exposure; never logged, never in images.
- `gitleaks` in pre-commit + CI guards against accidental commits (doc 4 §Secrets).

## Database operations

- **Migrations:** Flyway runs on `api` startup (or a one-shot migrate step in the deploy) — schema is versioned and reproducible.
- **Backups (a security + continuity control):**
  - Nightly `pg_dump`, **encrypted**, copied **off the VPS** (object storage or another host).
  - Retention (e.g. 7 daily + 4 weekly).
  - **Test the restore** on a schedule — an untested backup isn't a backup.
- Postgres data on a named Docker volume; never inside the container layer.

## CI/CD

On push to `main`:
1. **Build** web, admin, api.
2. **Test** — unit + integration (Testcontainers) + web/admin tests.
3. **Scan** — `npm audit`, OWASP Dependency-Check, Trivy (images), gitleaks. **High severity fails the build.**
4. **Publish** images (registry) tagged by commit.
5. **Deploy** to the VPS — pull images, run migrations, `docker compose up -d`, health-check, done. Keep the previous images for instant rollback.
6. **Never print secrets** in logs.

Prefer deploying **staging first**, verifying (incl. the pentest scan on notable changes), then promoting to prod.

## Environments

| Env | How | Purpose |
| --- | --- | --- |
| local | each app runs directly; Postgres in Docker | develop |
| staging | a compose profile or a `staging.` subdomain on the VPS | test releases, run ZAP/nuclei, preview content |
| production | `docker-compose.prod.yml` behind Cloudflare | live |

## Monitoring & alerting (small-VPS appropriate)

- **Uptime/health checks** hitting `/api/health` and the homepage; alert on failure.
- **Error alerting** from the api (log-based or a lightweight error tracker).
- **Host metrics:** disk, CPU, memory — a tiny VPS fills up; alert before it does.
- **Security signals:** failed-login and rate-limit alerts (doc 4 §9).
- **Log hygiene:** structured logs, rotated, no secrets/PII.

## First-release launch checklist

Run this the day you go live (ties to Phase 10 review gate):

- [ ] DNS points to the VPS; Cloudflare proxy ON; VPS firewall allows only Cloudflare + your SSH.
- [ ] TLS valid; **SSL Labs A+**; HSTS on (consider preload after you're confident).
- [ ] **securityheaders.com A/A+**; CSP not breaking any page (test site, tools, admin).
- [ ] All public pages render in prod: home, article, `/tools` + all 8 tool pages, deals, stack, newsletter, about.
- [ ] All 8 tools work **with an empty Network tab** (privacy promise holds in prod).
- [ ] Newsletter subscribe → confirm → active works end-to-end; unsubscribe works.
- [ ] `/admin` reachable only with auth + 2FA; `noindex`; audit log records a test edit; publish → page updates live.
- [ ] `sitemap.xml`, `robots.txt`, `llms.txt`, `rss.xml` resolve and are correct; sitemap submitted to Google + Bing.
- [ ] OG/Twitter preview renders (test the URL in a link unfurler); favicon shows.
- [ ] Custom **404** and **500** pages.
- [ ] **Backups run and a restore was tested.**
- [ ] Monitoring/alerts live; force a failure and confirm an alert fires.
- [ ] **Rollback plan** written and tested (redeploy previous image tag).
- [ ] Pentest pass (doc 4 §10) completed on staging with no medium+ open findings.

## After launch (keep it healthy)

- Patch dependencies on a cadence; keep CI scans green.
- Review audit log + security alerts.
- Re-run ZAP + scans after notable changes.
- Verify backup restores periodically.
- Watch Search Console / Bing coverage and Core Web Vitals; fix regressions.
