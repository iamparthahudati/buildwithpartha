# ADR-012 — LifeOS v1 privacy and external-processing posture

- Status: Accepted
- Date: 2026-08-16
- Owner: Partha
- Ticket(s): LOS-0113, LOS-0114
- Supersedes: None
- Superseded by: None

## Context

LifeOS will hold private planning, project, note, habit and reflection data. Implementation needs stable defaults for audience, geography, tracking, email, files, AI and deletion before database, identity, logging, backup and policy tickets begin. Final operator/provider facts and professional legal review are not yet available and cannot be invented.

## Decision drivers

- Minimize private-data collection and external disclosure.
- Keep v1 achievable for one owner without silently promising worldwide compliance.
- Prevent optional providers and reference-image features from becoming accidental launch dependencies.
- Give engineering deterministic lifecycle values that can be tested and revised before production if law/provider evidence requires it.

## Options considered

### Option A — Cautious personal-product launch

Use an adults-only, India-first, single-user product; exclude tracking, files and AI; keep only required identity/security email; adopt short export/deletion/backup periods and explicit later gates.

Benefits: smallest data/processor surface, clearer notice and more testable deletion. Costs: fewer launch features and later review before geographic or provider expansion.

### Option B — Broad feature/geography launch

Enable analytics, productivity email, files and AI while presenting the product globally from the first release.

Benefits: more launch capabilities. Costs: materially larger consent, provider, transfer, security, support and legal surface before the core product is proven.

## Decision

Use Option A as the v1 engineering and product posture:

- Audience is adults only (18+). Use minimal self-confirmation and do not collect date of birth or identity documents by default. This is a product restriction, not a claim of legally verified age.
- Product targeting and launch policy are India-first. Do not claim worldwide compliance or actively expand to another country until a jurisdiction/transfer review passes.
- Do not use advertising, behavioral analytics, session replay, marketing pixels, data sale/brokerage, cross-site profiles or private content for model training.
- Required verification, recovery and security email may operate as a service function. Productivity/reminder email remains off until a separate opt-in, preference, unsubscribe, provider and deliverability gate passes.
- Attachments remain absent until their optional storage/scanning/quota/authorization/privacy gate and a provider/storage ADR pass.
- AI remains future/off. No private LifeOS content may be sent to an AI provider before the dedicated AI privacy/security ADR and opt-in flow pass.
- Teams/sharing remain future; v1 records belong to one Account.
- Use 24 hours for completed export-package availability, 30 days for the proposed recoverable Account deletion grace, and a maximum 35-day backup lifetime.
- Use a proposed 365-day maximum for restricted security/compliance evidence where needed, subject to exact field/location/commencement review. Minimized operational data uses shorter classes from `31-PRIVACY-DATA-LIFECYCLE.md`.
- Final legal operator/contact, provider contracts/regions, policy copy, legal applicability and any legally required override remain production blockers. A legally required shorter/longer value supersedes an engineering default only through documented review and updated tests/notices.

## Consequences

### Positive

- Core implementation can proceed with deterministic privacy-minimizing defaults.
- The v1 processor and consent surface remains small.
- Export, deletion, backup restoration and log-retention tests can be designed before feature code spreads data.
- Optional files/AI cannot enter through incidental UI or dependency choices.

### Negative and risks

- Self-confirmed adults-only access is not strong age verification and requires legal confirmation for the actual launch audience.
- India-first does not technically prevent access from elsewhere; product targeting, notices and operational response must match the approved launch posture.
- Provider capabilities or applicable law may require a pre-launch retention/location change.
- Deferring files, AI and optional email reduces feature breadth at launch.

### Follow-up work

- LOS-0503/LOS-0509 implement versioned terms/privacy presentation and signup confirmation.
- LOS-0517–LOS-0519 implement Account export/deletion and privacy settings.
- LOS-1402 implements safe identity/security email; optional reminder gates stay separate.
- LOS-1506, LOS-1512 and LOS-1515 verify the threat model, privacy implementation and final quality/security gate.
- LOS-1608 implements/validates backup retention and deletion-ledger replay.
- LOS-1614 supplies verified operator/contact/provider/public policy values.
- LOS-1309–LOS-1311 and LOS-1704/LOS-1705 cannot enable files or AI without their new ADRs.

## Security, privacy and data impact

The complete inventory, purposes, classification, retention classes, browser storage, rights, export, deletion, logs, backups, email and processor requirements are binding in `31-PRIVACY-DATA-LIFECYCLE.md`. Every new data field or provider must update that map and pass the security/privacy definition of done.

## Rollout and rollback

Features default off and providers are absent, so the safe rollback is to keep the narrower posture. Geographic expansion, optional processing or retention changes require a superseding ADR, updated policy/data map, migrations/jobs where applicable and regression tests. If legal review rejects a value before launch, update implementation and notices before any production data is collected.

## Validation

- LOS-0114 owner gate accepts this posture for engineering.
- Privacy/data lifecycle, security, architecture, scope and QA contracts reference compatible boundaries.
- Production launch remains blocked until LOS-1515 and LOS-1614 close the legal/provider implementation evidence.
