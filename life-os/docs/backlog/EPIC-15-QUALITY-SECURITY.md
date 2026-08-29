# EPIC-15 — Quality, accessibility, security, and resilience

| ID | Ticket | Description and acceptance contract | Depends on | Estimate | Status |
| --- | --- | --- | --- | --- | --- |
| LOS-1501 | Build critical Playwright suite | Automate identity, project→task→schedule→focus→complete, reviews, recurrence, offline queue, export/delete using isolated users/data and deterministic time. | Core feature gates | L | Backlog |
| LOS-1502 | Build cross-user authorization matrix | For every user-owned endpoint/resource/action, user B cannot read/infer/mutate user A data, including IDs in nested/filter/export/file/search paths. | Core feature gates | M | Backlog |
| LOS-1503 | Run frontend accessibility audit | Axe plus keyboard, focus, screen-reader smoke, 200% zoom, 320px reflow, contrast/forced colors/reduced motion across routes; fix critical/serious. | UI feature gates | M | Backlog |
| LOS-1504 | Run responsive/browser matrix | Current supported Chrome/Firefox/Safari/Edge and mobile/touch layouts; record support policy and fix blocking inconsistencies. | UI feature gates | M | Backlog |
| LOS-1505 | Validate timezone and recurrence matrix | Automated/manual zones with DST/no-DST/half-hour, midnight/week/month/year/leap boundaries and timezone changes across tasks/blocks/reviews/habits/reports. | LOS-0918, LOS-1015, LOS-1214, LOS-1308 | M | Backlog |
| LOS-1506 | Run threat model | Data-flow/STRIDE-style review of auth, API, DB, files, mail, Cloudflare, offline cache, exports and admin/ops; every high risk has owner/mitigation/test. | LOS-1414 | S | Backlog |
| LOS-1507 | Add security headers and CSP | Caddy/app policies for CSP/HSTS/content type/referrer/permissions/framing; report-only tuning then enforcement; app works without unsafe broad exceptions. | LOS-1604 | S | Backlog |
| LOS-1508 | Add dependency/secret/container scans | CI/Scheduled scanning, severity policy, allowlist expiry/owner and SBOM/provenance artifacts. High/critical block release unless documented exception. | LOS-0212, LOS-1603 | S | Backlog |
| LOS-1509 | Perform application security testing | ZAP baseline/targeted active staging checks plus manual IDOR/CSRF/session/reset/upload/export/cache tests. Fix or formally accept all findings. | LOS-1502, LOS-1506–LOS-1508 | M | Backlog |
| LOS-1510 | Establish performance budgets | Route bundle, LCP/INP/CLS, API p95, DB query, memory/CPU and large-data budgets; automate representative checks and remediate failures. | LOS-1413 | S | Backlog |
| LOS-1511 | Test failure and recovery UX | Inject offline/timeouts/5xx/429/expired auth/stale version/job failure/partial widget failure; verify preserved work, honest state and recovery. | LOS-1501 | M | Backlog |
| LOS-1512 | Verify data export/deletion/privacy | Export completeness/portability, deletion/grace/purge/backup policy, session revoke, logs/redaction and policy copy match implementation. | LOS-0519 | S | Backlog |
| LOS-1513 | Run backup restoration rehearsal | Restore production-like encrypted backup into isolated environment, verify migrations and sampled user data, measure RPO/RTO, destroy restored copy safely. | LOS-1608 | S | Backlog |
| LOS-1514 | Prepare launch QA report | Consolidate automated/manual evidence, defects, accepted risks, browser/a11y/security/performance/restore results and explicit go/no-go. | LOS-1501–LOS-1513 | S | Backlog |
| LOS-1515 | Run final quality/security gate | Owner approves no open launch-blocking defects, critical/high findings, untested migrations, broken rollback or inaccessible core journeys. | LOS-1514 | S | Backlog |

