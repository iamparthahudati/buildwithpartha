# 04 — Security (hardening & pentest)

Your goal: "pen-test proved, hacking-proof." An honest framing first, then the concrete work.

> **No system is unhackable.** What we *can* do — and what "hardened" really means — is **defense in depth**:
> shrink the attack surface, close every known class of hole, make the remaining surface expensive to attack,
> detect attempts, and be able to recover. We validate that with automated + manual penetration testing.
> That is what a professional "secure site" is. This doc is the checklist to get there and stay there.

Two things already work in your favor by design:
- **The tools are client-only** — no server input to attack there, nothing to leak.
- **One VPS, same-origin, one reverse proxy** — a small, simple surface is a securable surface.

---

## 1. OWASP Top 10 — how each is handled

| Risk | Our defense |
| --- | --- |
| **A01 Broken Access Control** | Deny-by-default in Spring Security; admin APIs require an authenticated session; every object access checks ownership/state (no IDOR); soft-deleted/draft content 404s publicly; `/admin` unreachable without auth. |
| **A02 Cryptographic Failures** | TLS everywhere (Caddy + Cloudflare, HSTS); passwords hashed with Argon2/bcrypt; tokens stored hashed; TOTP secret encrypted at rest; no secrets in code. |
| **A03 Injection** | JPA parameterized queries (no string-built SQL); Bean Validation on every input; output encoding; content sanitized/compiled before render; no shell-outs on user input. |
| **A04 Insecure Design** | Least privilege, double-opt-in newsletter, no user enumeration, audit log, threat-modeled flows (login, subscribe, publish). |
| **A05 Security Misconfiguration** | Hardened headers, Actuator locked down, no stack traces to clients, default creds impossible, minimal container images, prod config via env. |
| **A06 Vulnerable Components** | Dependency scanning in CI (npm audit, OWASP Dependency-Check, Trivy) fails the build on high severity; pinned versions; regular updates. |
| **A07 Auth Failures** | Strong hashing, 2FA (TOTP) on admin, brute-force lockout, secure session cookies, short timeouts, no credential in URL. |
| **A08 Software/Data Integrity** | Signed/pinned dependencies, CI builds from source, no untrusted CDN scripts in admin, SRI where external scripts are unavoidable. |
| **A09 Logging/Monitoring Failures** | Security-event logging (failed logins, rate-limit hits, 4xx spikes) without logging secrets/PII; alerting; audit log. |
| **A10 SSRF** | The backend makes no outbound requests driven by user input; the ad snippets are output client-side only, never fetched server-side by URL. |

---

## 2. HTTP security headers (set at Caddy, and app-level where needed)

- **Content-Security-Policy (CSP)** — the big one. Default-deny; allow only your own origin for scripts/styles/images; `frame-ancestors 'none'` (no clickjacking); no inline scripts (use nonces/hashes). Tighten per-surface: the public site, the admin SPA, and the tool pages each get a CSP that allows exactly what they need and nothing more.
- **Strict-Transport-Security** — `max-age` long, `includeSubDomains`, `preload`.
- **X-Content-Type-Options: nosniff**
- **Referrer-Policy: strict-origin-when-cross-origin**
- **Permissions-Policy** — disable camera/mic/geolocation/USB etc. (the site needs none).
- **X-Frame-Options: DENY** (belt-and-suspenders with CSP frame-ancestors).
- **Cross-Origin-Opener-Policy / Resource-Policy** — isolate the origin.
- Remove `Server`/version banners.

**Verify:** `securityheaders.com` should grade **A/A+**.

---

## 3. Authentication & the admin panel (highest-value target)

The admin is where an attacker would aim. Lock it hardest.

- **Session, not localStorage.** On login the server sets an **httpOnly, Secure, SameSite=Strict** session cookie. JavaScript can't read it, so XSS can't steal it, and SameSite blocks cross-site use.
- **CSRF protection** on every state-changing request (Spring Security CSRF token; SameSite adds a second layer).
- **Strong password** (long, checked against breach lists) hashed with **Argon2id** (or bcrypt).
- **2FA (TOTP)** required for admin login (authenticator app).
- **Brute-force defense:** lock the account after N failed attempts (`locked_until`); exponential backoff; rate-limit the login endpoint; log every failure.
- **Short sessions:** idle + absolute timeout; re-auth for sensitive actions; logout invalidates server-side.
- **`/admin` is `noindex`** and not linked from the public site or sitemap.
- **Least privilege:** the admin can edit content; it cannot run arbitrary code, upload executables, or read secrets.
- **Audit everything:** every admin write → `audit_log` (who/what/when/before/after/IP).

**Manual test (must pass):** you personally cannot reach any `/api/admin/*` route without a valid session; you cannot act as another entity (IDOR); the CSRF token is required; a wrong TOTP is rejected; lockout triggers.

---

## 4. Input validation & output encoding (injection & XSS)

- **Validate every input** server-side with Bean Validation (type, length, format, allowlist). Client validation is UX only — never trust it.
- **Parameterized queries only** (JPA). Never build SQL/JPQL by string concatenation.
- **Sanitize/compile content** before it renders (doc 3 §Article body). Treat all stored content as untrusted.
- **React/Next auto-escape** output; never use `dangerouslySetInnerHTML` on unsanitized content.
- **Newsletter form:** strict email validation + a hidden **honeypot** field + rate limit + optional Cloudflare Turnstile if spam appears.
- **File handling:** no public uploads in first release (removes a whole risk class). If images are needed, admin-only, type/size checked, stored outside web root, served re-encoded.

---

## 5. Rate limiting & bot/DDoS protection (layered)

- **Cloudflare** (edge): DDoS protection, WAF rules, bot mode, rate rules on `/api/*` and `/admin`.
- **Caddy** (origin): connection/request limits; only Cloudflare IPs allowed to reach the origin (firewall + Caddy allowlist).
- **App** (Spring, Bucket4j): per-IP + per-account limits on `login`, `subscribe`, and all writes; `429` on trip.

---

## 6. Dependencies & supply chain

- **CI scans, build-breaking on high severity:** `npm audit` (web/admin), **OWASP Dependency-Check** (api), **Trivy** (container images), **gitleaks** (secrets in git).
- **Pin versions**; update on a schedule, not by drift. Watch security advisories for Spring/Next/Postgres/Caddy.
- **Minimal images** (distroless/temurin-jre, alpine where sane) — fewer packages, fewer CVEs.
- **No untrusted third-party scripts** in the admin. On the public site, the only third-party is the ad network — sandbox/isolate it and keep it out of admin entirely.

---

## 7. Secrets management

- **Nothing secret in git — ever.** `.env.example` is committed; real `.env` is git-ignored and lives only on the VPS (or a secret store).
- `gitleaks` in pre-commit + CI to catch accidental commits.
- Distinct secrets per environment; **rotate** anything ever exposed.
- App reads secrets from env at boot; they're never logged, never returned in errors, never sent to the client.

---

## 8. Infrastructure hardening (the VPS)

- **Firewall:** only 80/443 open to the world, and even those **only from Cloudflare IP ranges**; SSH on a key (no passwords), ideally IP-restricted, root login disabled.
- **Postgres never public** — internal Docker network only; strong credentials; least-privilege DB user for the app.
- **Containers:** run as non-root, read-only filesystems where possible, drop Linux capabilities, no `--privileged`, resource limits.
- **OS:** automatic security updates; minimal installed packages; fail2ban on SSH.
- **TLS:** Caddy auto-manages Let's Encrypt certs; A+ on `ssllabs.com`; HSTS preload.
- **Backups are a security control** (ransomware/loss): nightly encrypted Postgres dumps, stored off-box, with a **tested** restore (doc 6).

---

## 9. Privacy (it's part of security and it's the site's stated position)

- The site's promise: "no tracking beyond page counts." Honor it — no invasive analytics; privacy-respecting counts only.
- Subscriber emails are **personal data**: minimal collection, hashed tokens, least-privilege access, export + delete on request, one-click unsubscribe.
- Tools process data **only in the browser** — say so in the UI, and make it true (verify empty Network tab).
- Affiliate disclosure and "Advertisement" labels are always on (legal + ethical).

---

## 10. The penetration-test pass (Phase 9)

Do this against a **staging** deploy that mirrors prod, before launch, and repeat periodically.

**Automated:**
- **OWASP ZAP** — baseline passive scan, then an authenticated active scan (give it an admin session). Fix all medium+.
- **Nuclei** — templated checks for known misconfigs/CVEs.
- **testssl.sh / SSL Labs** — TLS config. Target A+.
- **securityheaders.com** — headers. Target A/A+.
- Re-run the CI dependency/container/secret scans; all green.

**Manual (walk the OWASP Top 10 by hand):**
- **Access control / IDOR:** try to reach every admin API and every "other user's" object without/with wrong auth. All must fail.
- **Auth:** brute-force lockout works; TOTP enforced; session fixation not possible; logout truly invalidates.
- **CSRF:** a forged cross-site write is rejected.
- **XSS:** attempt stored/reflected XSS via article body, deal fields, newsletter email, tool inputs (tool inputs never reach a server, but still shouldn't self-XSS in the page).
- **Injection:** attempt SQL/JPQL injection via every parameter.
- **Info leak:** confirm no stack traces, no version banners, no user enumeration on subscribe/login.
- **Rate limits:** confirm `subscribe`/`login`/writes trip `429`.

**Exit criteria:** ZAP active scan free of medium+ findings; A/A+ on TLS and headers; every manual check passes; CI scans green. Record results; re-test after any significant change.

> **Optional but recommended for a long-lasting project:** once live and stable, commission a one-off
> professional penetration test, and/or set up a simple responsible-disclosure contact
> (`/.well-known/security.txt`) so researchers can report issues to you.

---

## 11. Ongoing (after launch — security isn't a phase, it's upkeep)

- Watch advisories; patch promptly; keep dependency scans green.
- Review the audit log and failed-login alerts.
- Re-run ZAP + scans after notable changes.
- Test a backup restore on a schedule.
- Rotate secrets periodically.
