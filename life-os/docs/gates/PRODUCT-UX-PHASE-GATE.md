# Product and UX phase gate

- Gate ticket: LOS-0114
- Date: 2026-08-16
- Result: Pass for Phase 1 engineering foundations; not a production or legal-compliance approval
- Owner: Partha
- Owner approval evidence: after receiving the LOS-0114 purpose and acceptance summary, the owner instructed, “ok complete that”.

## Gate boundary

This gate approves the LifeOS product/UX baseline for implementation. It does not claim that the low-fidelity wireframes are finished visual designs, that the application exists, or that production legal/provider/infrastructure values are complete. Those concerns remain owned by the tickets listed below.

Implementation may begin with LOS-0201 and LOS-0202. `master` remains unchanged; no production release is authorized by this gate.

## Prerequisite evidence

| Ticket | Result | Evidence accepted at this gate |
| --- | --- | --- |
| LOS-0101 | Pass baseline | `20-PERSONAS-AND-JOBS.md` defines owner-centered personas, accessibility situations, ranked jobs and measurable outcomes; real-use revalidation remains scheduled. |
| LOS-0102 | Pass | `21-SCOPE-MATRIX.md` separates required v1, optional launch gates and future work. |
| LOS-0103 | Pass | `22-INFORMATION-ARCHITECTURE.md` defines the connected LifeOS loop, canonical records, relationships and destination hierarchy. |
| LOS-0104 | Pass | `23-NAVIGATION-AND-ROUTES.md` defines public/protected routes, nested `/life-os` behavior, responsive navigation and safe Back/dirty/auth return behavior. |
| LOS-0105 | Pass | `24-CRITICAL-USER-JOURNEYS.md` covers eight critical journeys with failures and recovery, including account export/deletion. |
| LOS-0106 | Pass | `25-ONBOARDING-SPECIFICATION.md` defines a resumable four-step flow with required timezone and optional preferences. |
| LOS-0107 | Pass | `26-TODAY-INFORMATION-PRIORITY.md` defines Today hierarchy, metric sources, freshness, state handling and responsive order. |
| LOS-0108 | Pass | `27-REVIEW-RITUALS.md` defines daily, weekly and monthly review prompts, snapshots, skip/resume and neutral language. |
| LOS-0109 | Pass baseline | Six responsive wireframe specifications cover auth, shell, work, planning, knowledge and shared states/overlays. |
| LOS-0110 | Pass baseline | `28-CRITICAL-INTERACTION-PROTOTYPE.md` specifies seven critical interactions with pointer, keyboard/touch, pending, responsive and recovery paths. |
| LOS-0111 | Pass | `29-PRODUCT-VOCABULARY.md` is the canonical UI, API, Java, TypeScript and database naming contract. |
| LOS-0112 | Pass | `30-CONTENT-AND-TONE-GUIDE.md` defines original LifeOS copy, state truthfulness, validation, destructive language and localization rules. |
| LOS-0113 | Pass baseline | `31-PRIVACY-DATA-LIFECYCLE.md` maps data, purpose, flow, retention, consent/notice, export, deletion, logs, backups, email, processors, files and AI. |

Every prerequisite has a ticket handoff and is recorded complete in the status ledger.

## Owner-approved product decisions

| Area | Gate decision |
| --- | --- |
| Product | The product is LifeOS, a private account-based personal operating system at `buildwithpartha.tech/life-os`; reference screens guide patterns only. |
| Audience | v1 is personal, single-user-per-account and adults-only. Teams, sharing and guardian/child flows are not v1. |
| Scope | The Required, Optional gate and Future categories in `21-SCOPE-MATRIX.md` are accepted. Optional absence cannot break a required workflow. |
| Navigation | The canonical destinations/routes and responsive navigation model are accepted for implementation. |
| First experience | Signup/login precede protected use; onboarding reaches an honest Today screen without fake records. |
| Build order | Engineering foundations, design tokens, atoms and composed components precede feature screens. |
| UX quality | Responsive mobile/tablet/desktop, keyboard access, WCAG 2.2 AA target, truthful persistence states and recoverable errors are binding. |
| Language | LifeOS vocabulary and tone are binding; reference-product names, identities and fixture data are prohibited. |
| Privacy posture | ADR-012 accepts the cautious India-first, no-tracking, service-email-only, files-off and AI-off defaults plus the proposed deletion/backup periods as engineering values pending final legal/provider verification. |
| Deployment | ADR-011 remains binding: the main site and LifeOS are independently deployable React/Java applications on the owner's VPS behind Cloudflare. |

## Material unknowns and assigned closure

An unknown may remain after this gate only when it has an owner and a ticket/decision boundary.

| Unknown or evidence gap | Classification | Required closure |
| --- | --- | --- |
| Exact React/Java/Spring/dependency patch versions and lockfiles | Engineering, not product-blocking | LOS-0201, LOS-0202 and LOS-0203 |
| Route helpers, loaders and executable nested-base proof | Engineering | LOS-0201, LOS-0207 and LOS-0210 |
| Exact visual token values, LifeOS mark and component dimensions | Design implementation | LOS-0301 through LOS-0333; composed patterns through LOS-0434 |
| Owner-centered assumptions have not yet been tested through sustained real use | Product evidence | Walkthrough at LOS-0616, workflow revalidation at LOS-0918, then actual-use prioritization after v1 |
| Git remote, hosted checks and branch protection are not configured | Delivery control | LOS-0212 must bind required checks/protection when a remote exists; LOS-1615 cannot launch without it |
| Legal operator/controller name, privacy/grievance contact and final public policy wording | Production/legal blocker | LOS-1614; implementation/privacy consistency checked by LOS-1512 and final gate LOS-1515 |
| Final launch-law applicability, DPDP/CERT-In dates and exact security-log fields/location | Production/legal blocker | LOS-1506, LOS-1512, LOS-1515 and qualified legal review immediately before launch |
| VPS, SMTP, backup, monitoring and Cloudflare service/provider details, regions and contracts | Production/processor blocker | LOS-1402, LOS-1601, LOS-1602, LOS-1606, LOS-1608, LOS-1610 and LOS-1614 |
| Staging hostname/access and supported-browser evidence | Release evidence | LOS-1504 and LOS-1605 |
| Attachments storage/scanning/quota/privacy design | Optional gate | LOS-1309–LOS-1311 plus a new provider/storage ADR; feature stays absent if the gate does not pass |
| AI provider/purpose/retention/safety | Future | LOS-1704 and LOS-1705 plus a new AI/provider ADR; no v1 AI data flow |
| Future main-site React/Java migration | Separate product scope | Requires its own backlog and ADR updates; it cannot silently enter LifeOS tickets |

No unresolved item above blocks LOS-0201/LOS-0202. Legal, provider, infrastructure and release-control items do block their named feature or production gate.

## Consistency checks

- Product name, URL and route ownership agree across charter, product context, architecture, routes and ADR-011.
- Scope matrix, product specification, roadmap and backlog agree that teams/AI/external calendar/native apps are future.
- Optional attachments, PDF, PWA/offline queue and productivity email have explicit hidden/available fallbacks.
- Wireframes map to canonical routes and shared components without allowing screen tickets to create private one-off primitives.
- Vocabulary, content guide, UX states and offline language agree on Saving, Saved, Device draft, Queued and Sync conflict.
- Privacy inventory agrees with security, offline, architecture, scope, definition of done and release QA.
- Every known implementation risk from LOS-0101–LOS-0113 has an existing ticket/gate or the accepted ADR-012 boundary.

## Validation evidence

- All LOS-0101–LOS-0113 handoff files are present.
- LifeOS documentation validator passes with 315 unique ticket IDs and no broken local links.
- Whitespace/diff validation passes.
- Reference-product names appear only in explicit prohibition/context guidance, not as LifeOS product copy or fixtures.
- No application dependencies, database migrations, provider accounts, VPS/Cloudflare settings or production data were created by this gate.

## Gate decision

Proceed to Phase 1 — Foundations and component library. Begin with `LOS-0201 — Bootstrap React application`, followed independently by `LOS-0202 — Bootstrap Spring Boot API`. Do not merge to `master` or publish until the later phase/release gates pass.
