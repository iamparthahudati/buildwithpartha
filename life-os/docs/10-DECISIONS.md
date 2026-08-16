# Decision log

| ID | Status | Decision | Reason |
| --- | --- | --- | --- |
| ADR-001 | Accepted | Preserve the existing buildwithpartha application and isolate LifeOS under `life-os/`. | Avoids overwriting unrelated production work. |
| ADR-002 | Accepted | Serve LifeOS at `/life-os/` and its API at `/life-os/api/v1/`. | Matches the requested public URL and keeps browser/API same-origin. |
| ADR-003 | Accepted | React 19 + TypeScript + Vite for the client. | Meets React requirement; TypeScript reduces contract errors; Vite supports a nested public base. |
| ADR-004 | Accepted | Java 21 + Spring Boot for the API. | Meets Java requirement with an LTS JDK and mature server ecosystem. |
| ADR-005 | Accepted | PostgreSQL + Flyway. | Strong relational fit for linked planning data and controlled migrations. |
| ADR-006 | Accepted | Opaque server-side sessions in secure cookies, not browser-stored JWTs. | Same-origin application benefits from revocable sessions and reduced token exposure. |
| ADR-007 | Accepted | VPS Docker Compose + Caddy, with Cloudflare in front. | Matches requested hosting and provides reproducible origin routing/TLS. |
| ADR-008 | Accepted | Component-first delivery is a release gate. | User explicitly requires every small component before full screens. |
| ADR-009 | Accepted | `master` production, `develop` integration, `feature/*` per ticket. | User's required Git model. |
| ADR-010 | Accepted | v1 is single-user-per-account; teams/sharing deferred. | Keeps authorization and product scope deliverable while preserving future expansion. |
| ADR-011 | Accepted | Keep the main site and LifeOS as separate deployable applications behind one hostname; route LifeOS under `/life-os` first. | Allows both products to use React/Java safely while isolating releases, sessions, data, caching and rollback. |
| [ADR-012](./adr/ADR-012-V1-PRIVACY-POSTURE.md) | Accepted | Use an adults-only, India-first, no-tracking v1; required-service email only, files/AI off, and short tested export/deletion/backup defaults. | Minimizes private-data and provider exposure while leaving final legal/provider evidence as a production gate. |

Create a dedicated file in `docs/adr/` for any decision that changes these contracts. Do not rewrite history silently.
