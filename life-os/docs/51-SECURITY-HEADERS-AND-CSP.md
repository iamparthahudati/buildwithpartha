# LifeOS Security Headers and Content Security Policy (CSP) Specification

- Status: Accepted
- Date: 2026-09-11
- Ticket: [LOS-1507](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-15-QUALITY-SECURITY.md)
- Depends on: [LOS-1604](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/38-PRODUCTION-COMPOSE-AND-CADDY.md)

---

## 1. Executive Summary & Policy Scope

This specification establishes the defense-in-depth HTTP security header and Content Security Policy (CSP) architecture for LifeOS. Security headers are enforced consistently across all three execution tiers:

1. **Edge Reverse Proxy (Caddy / Cloudflare)**: Outer boundary enforcing strict transport security, cross-origin boundary policies, anti-framing, and perimeter Content Security Policy.
2. **Static Web Server (Nginx container)**: Inner static host enforcing headers on all HTML documents, JavaScript bundles, stylesheets, fonts, and assets.
3. **Application REST API (Spring Boot container)**: Backend API service enforcing restrictive security headers on every JSON response, binary download stream, Actuator probe, and RFC 7807 problem detail.

---

## 2. Security Headers Matrix

The table below outlines the exact HTTP response headers enforced across all LifeOS environments:

| HTTP Header | Production & Staging Value | Purpose & Threat Mitigation |
| --- | --- | --- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;` | Mitigates Cross-Site Scripting (XSS), malicious script injection, data exfiltration, and unauthorized iframe embedding. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Enforces HTTPS exclusively across the apex domain and all subdomains for 1 year with HSTS preload compatibility. |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing attacks (e.g., executing uploaded text or images as JavaScript). |
| `X-Frame-Options` | `DENY` | Prevents clickjacking and framing attacks across all user agents. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Protects sensitive path and query parameters by only sending origin on cross-origin requests and withholding referrer on downgrade. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=()` | Restricts browser hardware and sensitive APIs from being accessed by third-party scripts or embedded contexts. |
| `X-XSS-Protection` | `0` | Disables legacy, buggy browser XSS filter/auditors that introduce side-channel vulnerabilities. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates the browsing context to same-origin windows, preventing cross-window DOM manipulation and Spectre attacks. |
| `Cross-Origin-Resource-Policy` | `same-origin` | Blocks other origins from loading application resources (images, scripts, APIs) across origin boundaries. |
| `X-Robots-Tag` *(Staging only)* | `noindex, nofollow, noarchive, nosnippet` | Prevents search engine indexing of staging environments. |

---

## 3. Content Security Policy (CSP) Directives Breakdown

### 3.1 Directive Inventory

- **`default-src 'self'`**: Restricts all resource types not explicitly declared to same-origin.
- **`script-src 'self'`**: Enforces that only first-party scripts packaged in the Vite application bundle (`/life-os/assets/*.js`) execute. **No `'unsafe-inline'` or `'unsafe-eval'` exceptions are permitted in production or staging.**
- **`style-src 'self' 'unsafe-inline'`**: Allows application CSS stylesheets (`/life-os/assets/*.css`) and dynamic CSS custom properties (design tokens) applied via React inline styles or component themes.
- **`img-src 'self' data: blob:`**: Permits same-origin images, SVG icons, base64 data URIs, and memory blob URLs used for client-side chart generation and data export downloads.
- **`font-src 'self'`**: Restricts web fonts to same-origin self-hosted fonts (`/life-os/assets/*.woff2`, `/fonts/*`).
- **`connect-src 'self'`**: Restricts fetch, XMLHttpRequest, and WebSocket connections exclusively to same-origin API endpoints (`/life-os/api/*`).
- **`frame-ancestors 'none'`**: Disallows embedding LifeOS inside any `<iframe>`, `<frame>`, or `<object>`, defending against clickjacking.
- **`base-uri 'self'`**: Prevents injection of malicious `<base>` tags that could alter relative URL resolution.
- **`form-action 'self'`**: Restricts HTML form submissions to same-origin targets.
- **`upgrade-insecure-requests`**: Instructs browsers to automatically upgrade any HTTP resource requests to HTTPS.

### 3.2 API Layer CSP (`ApiSecurityConfiguration.java`)

Because Spring Boot serves purely JSON problem details, JSON resource representations, and controlled file streams, the API filter chain enforces an even tighter policy:

```
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
```

This guarantees that if an API response is viewed directly in a browser window, the browser will refuse to render or execute any active HTML or script content.

---

## 4. Report-Only Tuning & Enforcement Lifecycle

The policy underwent report-only tuning during development to eliminate broad exceptions:

1. **Vite Bundle Validation**: Verified that production build outputs contain zero inline `<script>` blocks or `eval()` calls. The Vite bundle loader uses standard `<script type="module" src="...">`, enabling safe removal of `'unsafe-inline'` from `script-src`.
2. **Blob URL Handling**: Added `blob:` to `img-src` to support client-side file preview and canvas export workflows without violating image directives.
3. **Strict Transition to Enforcement**: All environments (production and staging) operate in full **Enforcement Mode** via the `Content-Security-Policy` header.

---

## 5. Multi-Tier Configuration Reference

### 5.1 Caddy Edge Proxy (`life-os/infra/caddy/Caddyfile.prod` & `deploy/caddy/Caddyfile`)

```caddy
header {
    -Server
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    X-Frame-Options "DENY"
    Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=()"
    X-XSS-Protection "0"
    Cross-Origin-Opener-Policy "same-origin"
    Cross-Origin-Resource-Policy "same-origin"
    Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
}
```

### 5.2 Web Frontend Container (`life-os/apps/web/nginx.conf`)

```nginx
# Security Headers
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "0" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
```

### 5.3 Backend API Container (`ApiSecurityConfiguration.java`)

```java
headers -> {
  headers.contentTypeOptions(Customizer.withDefaults());
  headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::deny);
  headers.httpStrictTransportSecurity(
      hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000).preload(true));
  headers.referrerPolicy(
      referrer ->
          referrer.policy(
              ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN));
  headers.addHeaderWriter(
      new StaticHeadersWriter(
          "Permissions-Policy",
          "camera=(), microphone=(), geolocation=(), payment=(), usb=(),"
              + " screen-wake-lock=()"));
  headers.contentSecurityPolicy(
      csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'"));
  headers.addHeaderWriter(new StaticHeadersWriter("X-XSS-Protection", "0"));
  headers.addHeaderWriter(new StaticHeadersWriter("Cross-Origin-Opener-Policy", "same-origin"));
  headers.addHeaderWriter(new StaticHeadersWriter("Cross-Origin-Resource-Policy", "same-origin"));
}
```

---

## 6. Automated Verification Matrix

Compliance is validated via three automated verification layers:

1. **Backend Integration Tests** (`SecurityHeadersIntegrationTests.java`):
   - `SH-1`: Public health liveness probe returns full security header suite.
   - `SH-2`: Public health readiness probe returns full security header suite.
   - `SH-3`: Public auth endpoints (`/auth/login`) return full security headers.
   - `SH-4`: Authenticated user resources (`/auth/sessions`) return full security headers.
   - `SH-5`: 401 Unauthorized problem responses return full security headers.
   - `SH-6`: 403 Forbidden CSRF rejection problem responses return full security headers.
   - `SH-7`: 404 Not Found problem responses return full security headers.
   - `SH-8`: Anti-framing policy (`X-Frame-Options: DENY`, `frame-ancestors 'none'`) enforced.
   - `SH-9`: Content-Type sniffing disabled (`X-Content-Type-Options: nosniff`).
   - `SH-10`: Permissions-Policy restricts sensitive hardware APIs.

2. **Frontend Playwright E2E Tests** (`security-headers.spec.ts`):
   - Verifies unauthenticated login and signup pages load with 0 CSP console errors.
   - Verifies authenticated Today, Projects, Tasks, and Settings routes render and interact cleanly within strict CSP.
   - Verifies dynamic SVG charts and design token custom properties apply without style-src blockage.

3. **Infrastructure Shell Audit** (`validate-security-headers.sh`):
   - Statically validates that Caddyfile.prod, Caddyfile.staging, deploy Caddyfile, nginx.conf, and ApiSecurityConfiguration all declare required header directives with zero broad exceptions.

---

## 7. Verification Commands

```bash
# Run backend security headers test suite
./gradlew test --tests "tech.buildwithpartha.lifeos.auth.api.SecurityHeadersIntegrationTests"

# Run complete backend verification
./gradlew check

# Run frontend quality verification
npm run verify:quality

# Run static infrastructure security headers audit
sh life-os/scripts/validate-security-headers.sh --dry-run
```
