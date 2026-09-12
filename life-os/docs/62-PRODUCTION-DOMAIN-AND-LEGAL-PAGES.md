# LifeOS production domain, legal pages, and public routing specification

- Status: Accepted
- Date: 2026-09-12
- Ticket: [LOS-1614](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md)
- Depends on: [LOS-0113](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/31-PRIVACY-DATA-LIFECYCLE.md), [LOS-0603](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/23-NAVIGATION-AND-ROUTES.md), [ADR-011](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-011-MAIN-SITE-LIFEOS-BOUNDARY.md), [ADR-012](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-012-V1-PRIVACY-POSTURE.md)

---

## 1. Executive summary & policy scope

This specification defines the production domain structure, public landing experience, legal contracts, search engine crawler directives, RFC 9116 security contact declarations, canonical metadata, and error route behaviors for LifeOS on `buildwithpartha.tech`.

In accordance with [ADR-011](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-011-MAIN-SITE-LIFEOS-BOUNDARY.md) and [docs/38-PRODUCTION-COMPOSE-AND-CADDY.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/38-PRODUCTION-COMPOSE-AND-CADDY.md), LifeOS operates as a first-class application mounted under the `/life-os` subpath on the apex domain `buildwithpartha.tech`, preserving the existing static portfolio/root website at `/` while establishing distinct boundaries for application state, API endpoints, authentication flows, and public legal policies.

---

## 2. Production domain structure & path routing topology

| URI Pattern | Handling Tier | Target | Access & Crawler Policy |
| :--- | :--- | :--- | :--- |
| `https://buildwithpartha.tech/` | Caddy (Host static) | `/var/www/buildwithpartha/site` | Public; indexed by search crawlers. |
| `https://buildwithpartha.tech/robots.txt` | Caddy (Host static) | `/robots.txt` | Public; directives governing crawler indexing. |
| `https://buildwithpartha.tech/.well-known/security.txt` | Caddy (Host static) | `/.well-known/security.txt` | Public RFC 9116 vulnerability reporting contact. |
| `https://buildwithpartha.tech/life-os` | Caddy -> Web Nginx | React SPA (`LandingRoute`) | Public minimal landing & sign-in entry. |
| `https://buildwithpartha.tech/life-os/privacy` | Caddy -> Web Nginx | React SPA (`PrivacyRoute`) | Public legal policy; indexed. |
| `https://buildwithpartha.tech/life-os/terms` | Caddy -> Web Nginx | React SPA (`TermsRoute`) | Public legal policy; indexed. |
| `https://buildwithpartha.tech/life-os/unavailable` | Caddy -> Web Nginx | React SPA (`UnavailableRoute`) | Public maintenance state; noindex. |
| `https://buildwithpartha.tech/life-os/login`, `/signup` | Caddy -> Web Nginx | React SPA (`LoginScreen`, `SignupScreen`) | Public auth forms; disallowed in `robots.txt`. |
| `https://buildwithpartha.tech/life-os/app/*` | Caddy -> Web Nginx | React SPA (`AppShell`, `RequireAuth`) | Protected private workspace; disallowed in `robots.txt`. |
| `https://buildwithpartha.tech/life-os/api/v1/*` | Caddy -> Backend API | Spring Boot REST API | Authenticated/rate-limited; disallowed in `robots.txt`. |

---

## 3. Public landing and entry route (`/life-os`)

The public landing route mounted at `/life-os` implements a calm, distraction-free product overview per [docs/30-CONTENT-AND-TONE-GUIDE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/30-CONTENT-AND-TONE-GUIDE.md):

1. **Brand & Identity**: Displays the official LifeOS mark and wordmark with accessible landmark headings.
2. **Session-Aware Navigation**:
   - For signed-out visitors: Renders clean calls-to-action to *Sign in* (`/life-os/login`) and *Create account* (`/life-os/signup`).
   - For active authenticated sessions: Renders an immediate continuation button to *Go to Today* (`/life-os/app/today`).
3. **Core Capability Pillars**:
   - *Plan with clarity*: Today dashboard, projects, sprints, and task prioritization.
   - *Deep focus & time blocks*: Time blocks, active focus timer, and brain dump triage.
   - *Habits & reflection*: Daily habit tracking, notes, and structured morning/weekly reviews.
   - *Private by design*: 100% data ownership, zero third-party behavioral trackers, and zero AI training.
4. **Footer Navigation**: Direct links to Terms of Service, Privacy Notice, and Security Contact.

---

## 4. Versioned legal pages specification

### 4.1 Privacy Notice (`/life-os/privacy`)

The LifeOS Privacy Notice enforces the principles established in [docs/31-PRIVACY-DATA-LIFECYCLE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/31-PRIVACY-DATA-LIFECYCLE.md), [ADR-012](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-012-V1-PRIVACY-POSTURE.md), and the India Digital Personal Data Protection Act, 2023 (DPDP Act 2023):

- **Effective Version**: Pinned to `PRIVACY_VERSION = "2026-08-01"` (matching auth consent records).
- **Data Fiduciary & Operator**: Partha (`buildwithpartha.tech`).
- **Data Classifications**:
  - *Class P1 (Account)*: Email address, display name, preferences, locale, timezone, consent records.
  - *Class P2 (User Content)*: Tasks, projects, habits, notes, time blocks, reflections.
  - *Class P3 (Security Metadata)*: Password hashes (Argon2id), session tokens, sanitized audit logs.
- **Explicit Zero-Processing Commitments**:
  - Zero third-party advertising or marketing trackers.
  - Zero sale or brokerage of personal data.
  - Zero utilization of private user content for machine learning / AI model training.
- **Data Portability & Retention Schedules**:
  - Self-service full JSON data export from Settings (24-hour download availability).
  - Account deletion with immediate session revocation and 30-day cancellation grace period.
  - Encrypted backup destruction after a strict 35-day retention ceiling.
- **Grievance Redressal**:
  - Data Protection & Grievance Officer: Partha
  - Grievance Email: `privacy@buildwithpartha.tech`
  - Response Window: Guaranteed response within 7 business days.

### 4.2 Terms of Service (`/life-os/terms`)

The Terms of Service define the mutual legal agreement between the operator and registered users:

- **Effective Version**: Pinned to `TERMS_VERSION = "2026-08-01"`.
- **Eligibility**: Adults (18+ years of age) for single-user personal productivity accounts.
- **100% User Content Ownership**: Users retain complete, unencumbered intellectual property rights over all tasks, notes, and records.
- **Acceptable Use Policy**: Prohibits automated scraping, denial of service, and unauthorized vulnerability probing.
- **Governing Law & Dispute Resolution**: Governed by the laws of India, subject to exclusive court jurisdiction in Bengaluru, Karnataka, India.
- **Legal Contact**: `legal@buildwithpartha.tech`.

---

## 5. Search crawler & indexing policy

To protect user privacy and prevent sensitive token parameters from entering search indices, LifeOS implements strict multi-layer crawler controls:

### 5.1 Robots.txt Directives (`/robots.txt` and `/life-os/robots.txt`)

```txt
User-agent: *
Allow: /$
Allow: /life-os$
Allow: /life-os/$
Allow: /life-os/privacy
Allow: /life-os/terms
Allow: /.well-known/security.txt
Allow: /life-os/.well-known/security.txt

# Disallow private application routes and sensitive auth token endpoints
Disallow: /life-os/app/
Disallow: /life-os/api/
Disallow: /life-os/login
Disallow: /life-os/signup
Disallow: /life-os/verify-email
Disallow: /life-os/forgot-password
Disallow: /life-os/reset-password
Disallow: /life-os/cancel-deletion
Disallow: /life-os/unavailable
```

### 5.2 Staging Ingress Protection

Staging environments (`staging.buildwithpartha.tech`) unconditionally inject HTTP header:
```
X-Robots-Tag: noindex, nofollow, noarchive, nosnippet
```

---

## 6. RFC 9116 security contact declaration

LifeOS publishes a standardized vulnerability disclosure policy at `/.well-known/security.txt` and `/life-os/.well-known/security.txt`:

```txt
Contact: mailto:security@buildwithpartha.tech
Expires: 2027-09-12T00:00:00.000Z
Preferred-Languages: en
Canonical: https://buildwithpartha.tech/.well-known/security.txt
Policy: https://buildwithpartha.tech/life-os/privacy
Hiring: https://buildwithpartha.tech
```

---

## 7. HTML head metadata & Open Graph standards

The application HTML document (`index.html`) declares standard metadata conforming to web interoperability standards:

- **Canonical URL**: `<link rel="canonical" href="https://buildwithpartha.tech/life-os" />`
- **Favicon**: `<link rel="icon" type="image/svg+xml" href="/life-os/favicon.svg" />`
- **Security Author**: `<link rel="author" href="https://buildwithpartha.tech/.well-known/security.txt" />`
- **Open Graph Metadata**: `og:type=website`, `og:url`, `og:title`, `og:description`, `og:site_name=LifeOS`
- **Twitter Cards**: `twitter:card=summary`, `twitter:title`, `twitter:description`

---

## 8. Error routes and recovery behavior

1. **Unavailable Route (`/life-os/unavailable`)**: Public maintenance fallback rendering standard `ErrorState` without leaking cached private data.
2. **Public 404 Route**: Renders public `ErrorState` directing visitors back to `/life-os`.
3. **Private 404 Route**: Renders within `AppShell` directing authenticated users to `/life-os/app/today`.
4. **Client Error Boundary**: Catches uncaught runtime exceptions gracefully with retry options and zero token exposure.

---

## 9. Automated verification

Compliance is verified through:
`sh life-os/scripts/validate-production-domain-and-legal-pages.sh --dry-run`

The audit suite asserts:
1. Specification completeness and required legal/domain sections.
2. Web static assets (`robots.txt`, `.well-known/security.txt`, `favicon.svg`).
3. Frontend route implementations (`LandingRoute`, `PrivacyRoute`, `TermsRoute`, `UnavailableRoute`, `NotFoundRoute`).
4. HTML `<head>` metadata, canonical links, and Open Graph tags.
5. Legal consent version consistency between frontend (`legalVersions.ts`) and backend domain records.
