# LifeOS Application Security Testing (DAST & Penetration Testing) Specification & Verification Report

- Status: Accepted
- Date: 2026-09-11
- Ticket: [LOS-1509](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-15-QUALITY-SECURITY.md)
- Depends on: [LOS-1502](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/46-CROSS-USER-AUTHORIZATION-MATRIX.md), [LOS-1506](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/50-THREAT-MODEL.md), [LOS-1507](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/51-SECURITY-HEADERS-AND-CSP.md), [LOS-1508](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/52-DEPENDENCY-SECRET-CONTAINER-SCANS.md)

---

## 1. Executive Summary & Scope

This specification and audit report establishes the dynamic application security testing (DAST), automated fuzzing, and manual/automated penetration testing framework for LifeOS.

Following the STRIDE threat model ([50-THREAT-MODEL.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/50-THREAT-MODEL.md)), defense-in-depth HTTP security headers ([51-SECURITY-HEADERS-AND-CSP.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/51-SECURITY-HEADERS-AND-CSP.md)), multi-tier dependency/secret/container scanning ([52-DEPENDENCY-SECRET-CONTAINER-SCANS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/52-DEPENDENCY-SECRET-CONTAINER-SCANS.md)), and cross-user authorization matrix ([46-CROSS-USER-AUTHORIZATION-MATRIX.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/46-CROSS-USER-AUTHORIZATION-MATRIX.md)), LOS-1509 validates runtime exploit resistance across all production and staging surfaces:

1. **Dynamic Application Security Testing (OWASP ZAP)**: Baseline active and passive scanning against staging web and API runtime containers.
2. **Insecure Direct Object Reference (IDOR / BOLA)**: Row-level tenant isolation, nested sub-resource paths, and anti-enumeration across all API resources.
3. **Cross-Site Request Forgery (CSRF)**: Header-enforced token validation and cookie policy on state mutations.
4. **Session Management & Authentication Lifecycle**: Cookie attributes, cryptographic token entropy, single/multi-session revocation, and session fixation prevention.
5. **Password Reset & Verification**: Single-use token consumption, timing attack resistance, anti-enumeration, and expiry.
6. **Malicious File Uploads**: MIME validation, dangerous extension blocking, path traversal prevention, and quotas.
7. **Data Export & Privacy**: User-scoped exports, no-cache header enforcement, and download stream isolation.
8. **Caching & Information Leakage**: Restrictive `Cache-Control` headers, actuator lockdown, and sanitized RFC 7807 problem responses.

---

## 2. Dynamic Application Security Testing (DAST) Architecture

```
+-----------------------------------------------------------------------------------+
|                           OWASP ZAP Dynamic Testing Engine                        |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  | Baseline Passive   |   | OpenAPI-Driven Active |   | Targeted Authenticated |  |
|  | Policy Scanner     |   | Fuzzing & Mutation    |   | Context Probing        |  |
|  +---------+----------+   +-----------+-----------+   +------------+-----------+  |
+------------|--------------------------|----------------------------|--------------+
             |                          |                            |
             v                          v                            v
+-----------------------------------------------------------------------------------+
|                        LifeOS Staging / Pre-Production Gateway                    |
|                                                                                   |
|  [ Edge Proxy (Caddy) ] ----> [ Static Web (Nginx) ] ----> [ API (Spring Boot) ]  |
|  - Strict TLS & CSP           - Zero inline scripts        - Session & CSRF auth  |
|  - Anti-framing & HSTS        - Asset integrity checks     - IDOR isolation       |
+-----------------------------------------------------------------------------------+
```

### 2.1 OWASP ZAP Baseline Scan Policy
- **Scan Mode**: Passive inspection of all HTTP response headers, cookies, scripts, styles, forms, and caching directives across public and authenticated web routes.
- **Rule Set**: OWASP Top 10 (2021) baseline ruleset checking for missing security headers, cookie security (`HttpOnly`, `Secure`, `SameSite`), information leakage in error pages, and insecure links.
- **Gate Requirement**: 0 High, 0 Medium, and 0 Low unexempted findings.

### 2.2 OpenAPI-Driven Active Fuzzing & Parameter Mutation
- **Input Contract**: Automated import of authenticated OpenAPI specification (`/life-os/api/v1/openapi.json`).
- **Fuzzing Targets**: Query parameters, URL path variables, JSON body fields, content-type variations, unexpected HTTP verbs, oversized inputs, and SQL/XSS/Command injection payloads.
- **Assertion**: Uniform HTTP 400 `INVALID` / 404 `RESOURCE_NOT_FOUND` / 415 `UNSUPPORTED_MEDIA_TYPE` responses adhering strictly to RFC 7807 without stack trace or database dialect disclosure.

---

## 3. Targeted Penetration Testing Matrix across 8 Core Vulnerability Classes

### 3.1 Insecure Direct Object References (IDOR) & BOLA
- **Threat**: Authenticated User B attempts to access, query, modify, or delete resources belonging to User A by replacing UUIDs in path parameters, query parameters, or foreign key references.
- **Verification Criteria**:
  - Direct GET by ID returns `404 RESOURCE_NOT_FOUND` with standard problem detail (indistinguishable from nonexistent resource).
  - Nested resource lookups (e.g., `/tasks/{taskId}/subtasks/{subtaskId}`) return `404` when either the parent task or subtask belongs to another user.
  - Foreign reference validation on create/update (e.g., linking a task to another user's project ID, sprint ID, or label ID) returns `400 BAD_REQUEST` with `INVALID` code.
  - Search, filter, and pagination endpoints strictly filter to the authenticated user's tenant ID and return 0 results for queries matching another user's private data.
- **Automated Test Coverage**: [CrossUserAuthorizationMatrixIntegrationTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/CrossUserAuthorizationMatrixIntegrationTests.java) (21 scenarios) and [ApplicationSecurityTestingIntegrationTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/ApplicationSecurityTestingIntegrationTests.java) (Section 1).

### 3.2 Cross-Site Request Forgery (CSRF) & State Mutation Gating
- **Threat**: An attacker tricks a victim's browser into issuing unauthorized state-changing requests (POST, PUT, PATCH, DELETE) using ambient credentials (cookies).
- **Verification Criteria**:
  - All state-changing requests require the `X-CSRF-TOKEN` HTTP header matching the active session's CSRF token hash.
  - Requests with missing `X-CSRF-TOKEN` are rejected with HTTP 403 `FORBIDDEN` / 400 `BAD_REQUEST`.
  - Requests with forged, mismatched, or expired `X-CSRF-TOKEN` are rejected.
  - Session cookies enforce `SameSite=Lax` and `Path=/life-os`, preventing cross-origin transmission on third-party POSTs.
- **Automated Test Coverage**: [ThreatModelSecurityIntegrationTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/ThreatModelSecurityIntegrationTests.java) and [ApplicationSecurityTestingIntegrationTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/ApplicationSecurityTestingIntegrationTests.java) (Section 2).

### 3.3 Session Management, Rotation, and Revocation Lifecycle
- **Threat**: Session fixation, session hijacking, stale token reuse, and incomplete multi-device revocation.
- **Verification Criteria**:
  - Session tokens are generated using cryptographically secure random bytes (256-bit entropy) and stored only as SHA-256 hashes.
  - Session cookies enforce `HttpOnly`, `Secure`, `SameSite=Lax`, and `Path=/life-os`.
  - Logging in issues a new session ID and cookie, rotating the previous unauthenticated or prior state.
  - Logout immediately deletes the session from the database and clears the cookie.
  - "Sign out all devices" revokes all active sessions for the user account.
  - Expired sessions (30-day lifetime or idle expiration) are immediately rejected with HTTP 401 `UNAUTHORIZED`.
- **Automated Test Coverage**: [ThreatModelSecurityIntegrationTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/ThreatModelSecurityIntegrationTests.java) and [ApplicationSecurityTestingIntegrationTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/ApplicationSecurityTestingIntegrationTests.java) (Section 3).

### 3.4 Password Reset & Identity Verification Security
- **Threat**: Password reset token brute-forcing, token replay, expired token acceptance, and user enumeration via recovery endpoints.
- **Verification Criteria**:
  - Verification and password reset tokens use high-entropy secure tokens stored only as cryptographic hashes.
  - Password reset tokens are single-use: upon successful password update, the token is permanently invalidated and cannot be replayed.
  - Expired tokens (e.g., > 1 hour) are rejected with standard invalid token error.
  - Password recovery requests return indistinguishable generic success responses (`200 OK` / "If an account exists, instructions have been sent") regardless of email registration status, mitigating user enumeration.
  - Password reset automatically invalidates all existing active sessions for the account.
- **Automated Test Coverage**: [ApplicationSecurityTestingIntegrationTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/ApplicationSecurityTestingIntegrationTests.java) (Section 4).

### 3.5 Malicious File Upload & MIME Injection Defense
- **Threat**: Uploading executable files, web shells, SVG scripts (Stored XSS), zip bombs, or using path traversal characters in filenames.
- **Verification Criteria**:
  - MIME type allowlist enforcement (`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`, `text/plain`, `text/markdown`, `text/csv`).
  - Dangerous executable types (`.exe`, `.sh`, `.bat`, `.jar`, `.html`, `.js`, `.svg`) and unallowlisted MIME types are rejected with HTTP 400 `INVALID`.
  - Filenames containing path traversal sequences (e.g., `../../etc/passwd`, `..\evil.sh`) are sanitized or rejected.
  - Individual file size ceiling (10 MB) and total user storage quota (100 MB) are strictly enforced.
  - File downloads are served with `Content-Disposition: attachment; filename="..."`, `X-Content-Type-Options: nosniff`, and `Cache-Control: private, no-cache`.
- **Automated Test Coverage**: [AttachmentControllerTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/attachment/api/AttachmentControllerTests.java), [AttachmentMimeValidatorTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/attachment/domain/AttachmentMimeValidatorTests.java), and [ApplicationSecurityTestingIntegrationTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/ApplicationSecurityTestingIntegrationTests.java) (Section 5).

### 3.6 Data Export Isolation & Privacy Boundary Enforcement
- **Threat**: Unauthorized access to user data archives, JSON/CSV/PDF export tampering, and proxy/browser caching of sensitive export files.
- **Verification Criteria**:
  - Export requests require active authenticated session and export only the requesting user's data.
  - User B cannot access or download User A's export by ID (`404 RESOURCE_NOT_FOUND`).
  - Export responses enforce restrictive caching headers: `Cache-Control: no-cache, no-store, max-age=0, must-revalidate` and `Pragma: no-cache`.
  - Sensitive authentication fields (password hashes, raw tokens, CSRF tokens) and deleted records are strictly excluded from exported datasets.
- **Automated Test Coverage**: [ApplicationSecurityTestingIntegrationTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/ApplicationSecurityTestingIntegrationTests.java) (Section 6).

### 3.7 HTTP Caching Policy & Actuator / Error Leakage Sanitization
- **Threat**: Sensitive authenticated responses cached in shared proxies or browser history; internal infrastructure leakage in Actuator endpoints or stack traces.
- **Verification Criteria**:
  - All authenticated API responses enforce `Cache-Control: no-store, private, no-cache, max-age=0, must-revalidate`.
  - Spring Boot Actuator endpoints are restricted: only `/actuator/health/liveness` and `/actuator/health/readiness` are accessible without internal component detail; Actuator discovery root (`/actuator`), heap dump, env, beans, and thread dump return 401/403/404.
  - All error responses adhere to RFC 7807 Problem Details and contain zero stack traces, exception class names, SQL snippets, or internal filesystem paths.
- **Automated Test Coverage**: [SecurityHeadersIntegrationTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/SecurityHeadersIntegrationTests.java), [ThreatModelSecurityIntegrationTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/ThreatModelSecurityIntegrationTests.java), and [ApplicationSecurityTestingIntegrationTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/ApplicationSecurityTestingIntegrationTests.java) (Section 7).

### 3.8 Cross-Site Scripting (XSS), Injection & Content Security Policy Integration
- **Threat**: Stored XSS in markdown notes, comments, task titles; SQL injection in dynamic filters/sorting; reflected XSS in search query parameters.
- **Verification Criteria**:
  - SQL queries use JPA criteria/parameterized queries, preventing SQL injection across all query and sort filters.
  - Frontend renders Markdown safely with strict sanitization; React JSX automatically escapes dynamic strings in DOM rendering.
  - Content Security Policy enforces `script-src 'self'` with zero `unsafe-inline` or `unsafe-eval` exceptions in production.
  - `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` prevent framing and MIME sniffing attacks.
- **Automated Test Coverage**: [SecurityHeadersIntegrationTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/SecurityHeadersIntegrationTests.java), [ApplicationSecurityTestingIntegrationTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/ApplicationSecurityTestingIntegrationTests.java) (Section 8).

---

## 4. Findings Register & Formal Risk Acceptance / Resolution Register

The matrix below documents all security testing findings identified during baseline DAST, automated fuzzing, and targeted penetration testing:

| Finding ID | Vulnerability Category | Severity (CVSS) | Target Surface / Vector | Resolution & Mitigating Controls | Status |
| --- | --- | --- | --- | --- | --- |
| **AST-01** | IDOR / BOLA | HIGH (7.5) | Nested sub-resource & task dependency lookups | Enforced row-level tenant filtering (`userId`) across all queries; returns uniform 404 for foreign IDs. | **Resolved** |
| **AST-02** | CSRF | HIGH (7.4) | State-mutating API endpoints (POST, PUT, DELETE) | Enforced mandatory `X-CSRF-TOKEN` validation on all mutating routes + `SameSite=Lax` cookies. | **Resolved** |
| **AST-03** | Information Disclosure | MEDIUM (5.3) | Spring Boot Actuator discovery & environment endpoints | Restricted `/actuator/*` in `ApiSecurityConfiguration`; only minimal liveness/readiness probes exposed. | **Resolved** |
| **AST-04** | Information Disclosure | MEDIUM (4.8) | Browser caching of authenticated API & export streams | Enforced `ApiCachePolicyFilter` returning `Cache-Control: no-store, private, must-revalidate` on all API endpoints. | **Resolved** |
| **AST-05** | Stored XSS / File Injection | HIGH (7.2) | Malicious SVG script upload / file attachments | Restricted MIME allowlist; banned SVG/HTML/executable uploads; enforced `Content-Disposition: attachment` and `nosniff`. | **Resolved** |
| **AST-06** | Session Fixation / Replay | HIGH (7.5) | Replaying revoked session cookie post-logout | Session token hashed with SHA-256 in DB; instant deletion on logout; single & all-device revocation verified. | **Resolved** |
| **AST-07** | Account Enumeration | LOW (3.5) | Password reset request for non-existent email | Uniform generic 200 OK response with constant-time email handling prevents account enumeration. | **Resolved** |
| **AST-08** | Client-side CSP Inline Styles | LOW (3.1) | Dynamic theme & custom property styles (`style-src 'unsafe-inline'`) | Formally accepted: `style-src 'self' 'unsafe-inline'` required for React inline style custom properties; mitigated by zero `script-src 'unsafe-inline'` and strict non-executable HTML sanitization. | **Formally Accepted** |

---

## 5. Formal Risk Acceptance Sign-off

### AST-08: Style-Src `'unsafe-inline'` Allowance
- **Risk Assessment**: Potential CSS-based injection if arbitrary user input is injected into `<style>` tags.
- **Compensating Controls**:
  1. `script-src 'self'` has zero `unsafe-inline` or `unsafe-eval` exceptions; JavaScript execution is fully blocked.
  2. All user-supplied data in the UI is rendered via React JSX (escaped by default) or sanitized markdown parser.
  3. No `<style>` injection or user-controlled CSS styling endpoints exist.
- **Approval**: Accepted by Security & Architecture Owners for Phase 15 release.

---

## 6. Verification & Audit Tooling

- **Automated Integration Test Suite**: [ApplicationSecurityTestingIntegrationTests.java](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/auth/api/ApplicationSecurityTestingIntegrationTests.java)
- **Security Audit Script**: [validate-application-security.sh](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/scripts/validate-application-security.sh)
- **CI / Scheduled Gating**: Integrated with `validate-docs.mjs`, `validate-security-scans.sh`, and GitHub Actions CI.
