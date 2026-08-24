# LifeOS privacy and data lifecycle

- Ticket: LOS-0113
- Legal-source check: 2026-08-16
- Status: product/engineering privacy baseline; legal review required before production

## Purpose and boundary

This document maps what LifeOS collects, why, where it flows, how long it remains, what an export contains and how deletion reaches live data, caches, jobs, files and backups. It is an implementation contract and launch checklist, not legal advice or a claim of compliance in every jurisdiction.

The production operator/controller legal name, VPS/backup locations, SMTP provider, privacy contact and final legal policy values are not yet supplied. They remain named production-gate decisions. No public privacy notice may invent them. ADR-012 records the accepted v1 engineering posture.

## Privacy principles

1. Collect the minimum data needed for a named LifeOS purpose.
2. Treat private productivity content as sensitive even when a law does not assign it a special category.
3. Keep authentication/security data separate from product content and user-readable Activity.
4. Never use private content for advertising, sale, cross-user profiling or model training.
5. Do not log Note bodies, Brain Dump Item text, Task descriptions, search queries, passwords, cookies, tokens or attachment content.
6. Make access, correction, export and deletion available from the Account without requiring support where automation is safe.
7. Call data Saved only after server confirmation; device drafts and queued mutations remain visibly distinct.
8. Apply deletion to derived indexes/caches/jobs and make backup restore reapply completed deletions.
9. Add a processor, telemetry product, file store or AI provider only after a data-flow/contract/retention review.
10. Review law, processors, retention and public notice before every production phase release.

## Current legal-source baseline

### India

LifeOS is being developed by an owner in India, so the India baseline is mandatory for launch review. The [Digital Personal Data Protection Act, 2023](https://www.indiacode.nic.in/handle/123456789/22037) covers digital personal data and establishes notice/consent, Data Fiduciary obligations and individual rights. Its official record now lists the [Digital Personal Data Protection Rules, 2025](https://upload.indiacode.nic.in/showfile?actid=AC_CEN_45_0_00003_2023-22_1763464807080&filename=dpdprules2025.pdf&type=rule) and phased commencement notifications.

As of the source-check date, the 13 November 2025 commencement notification brought institutional/defined provisions into force immediately, scheduled certain provisions for 13 November 2026, and scheduled many substantive processing, notice, consent, security, rights and enforcement provisions for 13 May 2027. Recheck the official Gazette immediately before launch; do not rely on this date summary as legal interpretation.

The notified Rules require, when the relevant rules commence, clear standalone notice with itemized personal data and purposes, reasonable security measures, affected-person breach communication, Board reporting detail within the specified timetable, rights contact information and child/guardian consent controls. They also include minimum security/log retention provisions that counsel must reconcile with data minimization.

The separate [CERT-In Directions under section 70B](https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf) require covered entities to report listed cyber incidents within six hours of noticing them, designate a point of contact, and retain ICT logs securely for a rolling 180 days within India. Applicability to the final legal/operator structure and exact log scope must be confirmed before launch.

### Conditional international scope

If LifeOS offers services to or monitors people in the EEA, the [EU General Data Protection Regulation](https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=EN) may add controller transparency, lawful-basis, rights, records, security, breach and international-transfer obligations. UK and other country/state regimes need their own launch review. Public internet reach alone is not used here to assert a legal conclusion.

ADR-012 makes v1 India-first. Until a documented jurisdiction/transfer review approves expansion, LifeOS must:

- avoid claiming worldwide privacy compliance;
- keep the system capable of access, correction, export, erasure, consent withdrawal and grievance handling;
- maintain a processor/transfer register;
- avoid targeted advertising, marketing trackers and behavioral profiling;
- require a jurisdiction review before actively launching/marketing outside the approved countries.

### Cloudflare responsibility

Cloudflare is an infrastructure processor/independent controller for some account/service data, not the LifeOS privacy policy. Cloudflare’s [Privacy Policy](https://www.cloudflare.com/privacypolicy/) states that customers remain responsible for their own sites/applications and end-user compliance. Review the applicable [Cloudflare data processing/SCC terms](https://www.cloudflare.com/en-gb/cloudflare-customer-scc/), selected services, logs, locations and subprocessors before enabling production proxy/security products.

## Accepted v1 engineering posture

LOS-0114 accepted these defaults through ADR-012. Final legal/provider review may require a documented pre-production change:

| Decision | Recommended v1 posture | Why |
| --- | --- | --- |
| Audience age | Adults only (18+); do not collect date of birth. Add a minimal age confirmation and clearly state the restriction. | LifeOS has no verified parental-consent/guardian workflow and can contain deeply private content. Self-declaration reduces risk but is not claimed as legal verification. |
| Launch geography | India-first until operator identity and international legal/transfer review are complete. | Processor locations and cross-border obligations are not yet fixed. |
| Analytics/advertising | No advertising, third-party behavioral analytics, session replay or marketing pixels. Use privacy-minimized operational metrics only. | Removes unnecessary tracking and cookie/consent complexity. |
| Email | Verification, recovery and security email are required-service messages. Productivity reminders are off until separate opt-in and unsubscribe/preference controls pass. | Keeps purpose and consent separate. |
| Files | Optional gate remains off until storage/scanning/quota/processor/retention ADR passes. | Files can contain high-risk content and metadata. |
| AI | Future gate remains off. No private content leaves LifeOS for AI processing. | Provider, purpose, training, region, retention and evaluation are unresolved. |
| Team sharing | Not available in v1. | Every record remains private to one account; sharing would change roles, notices and deletion rights. |

Any change to these defaults requires a superseding ADR and updates to this lifecycle, tests and public notice before affected processing begins.

## Data classification

| Class | Examples | Required handling |
| --- | --- | --- |
| P0 Public | Public entry, terms/privacy text, health status without private details | Integrity and safe caching; no private values mixed in. |
| P1 Account | Email, display name, locale, timezone, preferences, consent/terms versions | Encrypt in transit/at rest as available, strict ownership, purpose-limited export/deletion. |
| P2 Private content | Projects, Tasks, Notes, Brain Dump Items, Goals, Habits, Reviews, comments, schedule/focus history | Highest application privacy; no content logs/telemetry; per-user authorization and encrypted backups. |
| P3 Security | Password hash, token/session hashes, CSRF material, IP/user-agent security events, audit records | Restricted operations access, redacted logs, never normal export, retention/legal review. |
| P4 Optional high-risk | Attachments and any future AI prompt/output | Feature off until dedicated threat/privacy/processor review and explicit notice/control. |

User-authored P2/P4 content may incidentally contain health, financial, legal, location or third-party personal information. LifeOS does not request those categories, but protects all private content as if disclosure could cause significant harm.

## System data flow

```text
Browser
  -> Cloudflare DNS/proxy/WAF (IP, request/security metadata)
  -> VPS Caddy (access/security metadata; no request bodies)
  -> LifeOS Java API
       -> LifeOS PostgreSQL database (account + canonical private records)
       -> outbox/job worker
            -> SMTP provider (recipient + minimum message content)
       -> restricted logs/metrics/alerts (no private content)
       -> encrypted backup process -> off-VPS backup destination
       -> optional file store (OFF until approved)
       -> optional AI provider (FUTURE/OFF)

Browser device-local scope
  -> essential cookies
  -> non-sensitive display preferences
  -> approved encrypted-where-practical drafts/queue after offline gate
```

Cloudflare, VPS, database, mail, monitoring and backup records for LifeOS must remain logically separated from the future main `buildwithpartha.tech` application. Shared infrastructure must not create shared user profiles, analytics IDs, cookies, caches, databases, exports or deletion jobs.

## Processing inventory

“Basis candidate” is for counsel/notice design; engineering does not select a legal basis by code comment.

| Data/category | Exact purpose | Source | Storage/recipient | Basis candidate | Export | Deletion |
| --- | --- | --- | --- | --- | --- | --- |
| Email, normalized email, display name | Create/identify Account, communicate identity/security | User | PostgreSQL; SMTP recipient | Requested service/consent; legal review | Yes, display form only | Purge after account grace except documented legal/security minimum |
| Password hash | Authenticate Account | Derived from password | PostgreSQL only | Requested service/security | Never | Purge with Account; password itself never stored |
| Verification/reset token hash and expiry | Verify ownership and recover Account | System | PostgreSQL; raw token only in one outbound link | Requested service/security | Never | Short TTL; purge expired/consumed hashes on cleanup |
| Session token hash, CSRF material, device metadata, last seen | Secure signed-in session and revocation | Browser/system | PostgreSQL; restricted security view | Requested service/security | Safe session/device summary only | Token material on expiry/revoke; minimal event metadata per security retention |
| Locale, IANA timezone, week start, work hours, focus defaults | Render and calculate personalized planning correctly | User/device suggestion confirmed by user | PostgreSQL | Requested service | Yes | Purge with Account |
| Terms/privacy/consent version and timestamp | Prove presented/accepted choices and support withdrawal | User/system | PostgreSQL/audit | Consent/legal obligation candidate | Yes | Retain minimally under approved legal/audit period |
| Projects, Milestones, Tasks, Subtasks, dependencies, Labels, comments | Provide private work management | User | PostgreSQL/search projection | Requested service | Yes | Per-record recovery then purge; all purge on Account deletion |
| Time Blocks, Focus Sessions (including optional interruption notes), Sprints, Weekly Plans | Schedule, focus and planning history | User/system | PostgreSQL/report projection | Requested service | Yes | Same as private content |
| Goals, Goal Check-ins, Notes, Brain Dump Items, Habits/entries, Reviews | Private knowledge, growth and reflection | User | PostgreSQL/search/report projection | Requested service | Yes | Same as private content |
| Notifications | Deliver private in-app status/reminders/security events | System | PostgreSQL | Requested service/security; optional reminder consent | Yes for user-visible items | Eligible items expire/delete; security evidence follows audit retention |
| Product Activity Events | Explain user-visible record history | User/system | PostgreSQL | Requested service/accountability | Yes | Purge with owning Account/record unless required evidence is separated |
| Security Audit Events | Detect/investigate abuse and destructive/security actions | System | Restricted append-oriented store/table | Security/legal obligation candidate | Safe user-facing subset only | Security retention, then erase/anonymize unless legal hold |
| IP, user agent, route class, timestamps, result/security rule | Availability, abuse prevention and incident investigation | Network/system | Cloudflare/Caddy/API security logs | Security/legal obligation candidate | Normally not in self-service product export; rights response assessed | Fixed security retention; never log query/body/private title |
| Correlation ID, latency, status class, job outcome | Operate/debug service | System | Logs/metrics | Requested service/security | No personal content; access request assessed | Fixed operational retention/aggregation |
| Search query | Return private search results | User | Process in memory/query engine | Requested service | No separate history unless user explicitly enables recents | Do not server-log; device recents clearable and cleared on logout |
| Email address, template type, delivery status/message ID | Send and troubleshoot identity/security messages | System | Outbox + SMTP provider | Requested service/security | Safe message history if exposed | Short outbox/provider retention; security event retained minimally |
| Export request/package metadata | Fulfil data access/portability request | User/system | Job table + private temporary object/file | Requested service/rights | Package itself | Package auto-expires; request event retained minimally |
| Deletion/grievance/privacy request | Fulfil rights and prove completion | User/system | Restricted request/audit record | Rights/legal obligation | Yes, where appropriate | Content purged; minimal request/completion proof for approved period |
| Attachment content/metadata (optional) | User-requested file support | User | Private object store + metadata/scanner | Requested service/explicit feature notice | Yes, original or safe package | Parent/delete lifecycle + quarantine cleanup + backup expiry |
| AI prompt/context/output (future) | Only an explicitly requested, approved AI feature | User/system | Provider only under future contract | Separate informed opt-in/basis review | Yes | Provider/app deletion and zero/short retention contract required |

### Activity and audit event implementation

LOS-1404 limits Product Activity Events to event type, owning Account UUID, actor Account UUID, canonical subject type/UUID, allowlisted correlation ID and UTC occurrence instant. LOS-0823 adds a canonical object type/UUID so a Project feed can refer to a changed Task without copying its content. Reads require the owning Account UUID plus subject type/UUID and are bounded; Activity rows cascade with Account deletion. The Activity API resolves an object's current owner-scoped label and link at request time and returns a null object after deletion or failed ownership resolution. Labels, titles, descriptions, Comment/Subtask bodies and before/after snapshots are never persisted in Activity rows.

Security Audit Events are not exposed through a user-facing read port and contain only event type, outcome, optional opaque Account UUIDs, optional typed target/UUID, allowlisted correlation ID, UTC occurrence instant and expiry instant. Neither typed write contract accepts content strings, bytes, collections or maps, so titles, bodies, comment text, credentials, tokens, cookies, headers and arbitrary metadata cannot enter either event store. The Product Activity command's only string remains unavailable to callers: its allowlisted correlation ID is selected internally from request context.

Security Audit rows use the accepted R6 maximum of 365 days and a daily idempotent expiry cleanup. They deliberately do not foreign-key opaque Account UUID evidence to the live Account row, so an Account purge cannot silently erase still-required minimal security evidence; normal product access cannot query this table. Product Activity follows the owning record/Account lifecycle and is not copied into operational logs.

### Comment implementation

LOS-0821 stores Comment UUID, owning Account UUID, exactly one Task/Project parent UUID, body, `PLAIN_TEXT`/`MARKDOWN` format, UTC create/update/edit instants and an optimistic version. Composite parent/Account foreign keys prevent a Comment from referencing another Account's Task or Project even if an application authorization check regresses. Comment bodies are P2 Private content: they are excluded from logs, metrics, Security Audit metadata and Product Activity metadata. Plain text is never interpreted as markup. Markdown raw HTML/entities, images, reference links and unsafe destinations are neutralized before persistence; API tests cover script/entity, `javascript:`/`data:` link and remote-image attempts.

An explicit Comment delete immediately hard-deletes the body rather than promising a recovery window; this shorter entity-specific rule overrides R3 and is disclosed by the `204` operation description. Parent or Account deletion cascades the Comment row. The remaining `COMMENT_DELETED` Product Activity Event contains only typed event/subject UUID metadata and no body snapshot; it cascades with the Account. Comments remain included in Account export while present.

## Data not collected in v1

- Date of birth, government identity, postal address, phone number or payment data.
- Contacts/address book, precise location, microphone, camera, biometrics or health-device data.
- Advertising identifiers, cross-site tracking IDs, social logins or third-party calendar tokens.
- Employee/team/organization membership or other-user assignment data.
- Private content for advertising, data brokerage, public profiles or AI training.

If a later capability needs any item above, update scope, this inventory, threat model, public notice and consent/rights paths before collection.

## Retention classes

These are accepted engineering maximums under ADR-012. A shorter product-specific period wins unless a documented legal obligation requires longer; final legal/provider verification remains required before production.

| Class | Maximum/trigger | Applies to |
| --- | --- | --- |
| R0 Transient | Memory/request lifetime; no durable storage | Raw passwords, CSRF verification values outside required session store, search query processing |
| R1 Short-lived secret/job | Feature TTL; purge expired/consumed records within 7 days | Verification/reset token hashes, idempotency keys, failed job payloads after resolution |
| R2 Temporary artifact | 24 hours after ready/cancel/failure unless user renews request | Export packages and signed download access |
| R3 Recoverable user deletion | 30 days from archive/soft-delete where recovery is promised | Eligible private content; exact entity policy visible to user |
| R4 Active Account | While Account remains active and purpose is being provided | Account/profile/preferences and canonical private content |
| R5 Notification/operational | 90 days unless security/legal category | Eligible in-app notifications, privacy-minimized metrics, routine job results |
| R6 Security/compliance | 365 rolling days proposed; minimum/applicability confirmed by counsel | Restricted access/security/audit logs and required processing logs |
| R7 Backup | 35 days maximum after backup creation | Encrypted nightly database/object backups; off-VPS copy |
| R8 Closed rights/support request | 365 days after closure proposed | Minimal request, verification, decision and completion evidence |
| R9 Exception | Only while a documented legal hold/statutory need applies; reviewed at least quarterly | Narrow named records, isolated from product use |

### Retention rules

- Product content is not copied into logs to satisfy log retention.
- Security logs use minimized identifiers and route classes, not URLs containing private query text.
- R6 is chosen to accommodate the notified DPDP Rules’ future one-year security/processing-log provisions; counsel must define exact covered fields and start date. If only CERT-In applies, its current 180-day India-resident requirement still needs verification against the final operator.
- The operator must confirm that an India-resident log store is available if CERT-In applies; Cloudflare/VPS default logs alone are not assumed compliant.
- Inactive but non-deleted Accounts remain available while the service purpose continues. Revisit inactivity erasure annually and before the relevant DPDP Rules commence; do not surprise-delete a personal archive without notice and recovery.
- Retention jobs are monitored, idempotent and tested with boundary dates. “Forever” is not an accepted value.

## Cookies and browser storage

| Item | Purpose | Scope | Retention/control |
| --- | --- | --- | --- |
| Opaque session cookie | Authenticate requests | `Secure`, `HttpOnly`, `SameSite=Lax`, Path `/life-os` | Session policy; cleared/revoked on sign out/reset/deletion |
| CSRF bootstrap/token | Protect mutations | LifeOS origin/path; readable only where the chosen pattern requires | Rotate/expire with session/security policy |
| Navigation/density/theme preference | Device-local presentation | LifeOS namespaced local storage | Until user clears; no identity/profile inference |
| Device draft/offline queue (after gate) | Prevent loss during interruption | User/session-namespaced IndexedDB; encrypted where practical | Explicit expiry/size; clear on sign out/account switch/deletion |

No analytics, advertising or session-replay cookie/storage is approved. If that changes, a new consent/cookie assessment and opt-out mechanism is required. Essential-only operation should be documented; whether a banner is legally unnecessary must be confirmed for launch countries.

## Consent, notice and choices

### Separate records

Do not bundle these into one checkbox/version:

- terms acceptance;
- privacy notice version presented/acknowledged;
- service-processing consent record where consent is the applicable basis;
- optional productivity-reminder email consent;
- optional files notice/control if enabled;
- future AI feature opt-in per purpose/provider class.

Consent controls are off by default when optional, specific, informed, recorded and as easy to withdraw as to give. Withdrawal stops future optional processing without invalidating required Account/security processing; the UI explains any service consequence before confirmation.

### Privacy notice minimum sections

Before signup launches, publish versioned plain-language notice containing:

1. verified legal operator/controller identity and privacy/grievance contact;
2. itemized data categories and purposes;
3. applicable basis/consent and withdrawal method;
4. processors/categories and countries/transfer safeguards;
5. retention/deletion/backups;
6. access, correction, export, erasure, grievance and nomination/other applicable rights;
7. security and breach communication summary without overstating guarantees;
8. adults-only posture and what happens if an underage Account is discovered;
9. cookies/device drafts/offline behavior;
10. no advertising/sale and AI/files status;
11. effective date, prior versions and material-change notice method.

Privacy notice acknowledgment is not treated as consent where law requires a distinct affirmative consent. Terms acceptance is not a waiver of privacy rights.

## User rights and request workflow

LifeOS should support the broadest practical common denominator without requiring the user to name a law.

| Request | Self-service behavior | Manual/escalation behavior |
| --- | --- | --- |
| Access/understand | Settings shows categories, activity and processor/privacy links | Privacy contact supplies scoped explanation/recipients where required |
| Correct | Edit profile and content directly | Restricted identity fields follow verified correction workflow |
| Export/portability | Request machine-readable package with recent authentication | Support failed/inaccessible request without sending private attachments over ordinary email |
| Erase Account | Confirm/re-authenticate, revoke sessions, grace/cancel, purge status | Legal hold/identity dispute is documented and communicated without exposing security detail |
| Withdraw optional consent | Toggle reminder/optional feature off immediately | Provider-side suppression/deletion is propagated and recorded |
| Grievance | In-app/web form or published contact with reference/status | Human review, response and escalation path; deadline set from applicable law |
| Nominate/guardian | Not implemented for v1 | India-law requirement and accessible support path require legal/product decision before applicable commencement |

Internal service target: acknowledge privacy requests promptly and complete automated export/deletion sooner than 30 calendar days where safe. Applicable law may require a different deadline; the request record stores the governing deadline and escalation.

Identity verification is proportionate. Do not collect government ID by default to answer a request from an authenticated Account. High-risk requests use recent authentication, verified email and recovery/escalation rather than accumulating new identity documents.

## Export contract

### Package

The self-service export is a short-lived private archive containing:

- `manifest.json`: export version, Account ID, generated timestamp, locale/timezone and file inventory;
- account/profile/preferences and consent/terms history;
- Projects, Milestones, Tasks, Subtasks, dependencies and Labels;
- Time Blocks, Focus Sessions, Sprints, Weekly Plans and Reviews;
- Goals/Check-ins, Notes, Brain Dump Items, Habits/entries and comments;
- user-visible Activity and Notifications;
- recurrence definitions/exceptions;
- Attachments and metadata only when enabled, authorized and safe;
- README/schema documentation describing formats, timestamps, status values and omissions.

Use UTF-8 JSON/CSV/Markdown or other documented portable formats. Keep canonical UTC instants and timezone/local-date context. The package must be complete for one Account and contain no secrets or another user's data.

### Exclusions

Never export password/session/token/CSRF hashes, raw security secrets, internal abuse rules, unrelated infrastructure logs, other users, processor credentials or quarantined malicious content. A privacy access response may provide a safe summary of security/recipient data separately when legally required.

### Delivery

- Require an authenticated Account and recent authentication.
- Queue one idempotent job; expose status and failure safely.
- Store the package encrypted/private; use an unguessable short-lived authorized download.
- Default package expiry: 24 hours after ready; user may request a fresh package.
- Send email only that the export is ready; do not attach it or include the download secret in logs.
- Delete package and signed-access material on expiry, cancellation or Account deletion.

## Account deletion lifecycle

Accepted v1 engineering state machine under ADR-012:

```text
ACTIVE
  -> DELETE_REQUESTED (recent authentication + exact consequences)
  -> GRACE_PERIOD (30 days proposed; all sessions revoked; Account inaccessible)
       -> CANCELLED_BY_VERIFIED_OWNER -> ACTIVE
       -> grace expires
  -> PURGE_IN_PROGRESS
       -> live DB content/identity
       -> search/report projections
       -> notifications/outbox/queued mutations/device revocation signal
       -> exports and optional files
       -> provider deletion/suppression calls
       -> caches/CDN invalidation where applicable
  -> PURGED_LIVE
       -> encrypted backups expire naturally by day 35
       -> restore procedure reapplies deletion ledger before service
  -> COMPLETED
```

### Required behavior

- The confirmation names Account-wide loss, grace/cancel period, backup expiry reality and any legal exceptions.
- Request immediately revokes sessions, blocks email reminders and sends a security notice.
- Do not send private content in deletion emails.
- A random/opaque deletion job identity prevents retries from duplicating side effects.
- Parent/child order and foreign keys cannot strand private records.
- Search indexes, generated reports, attachments, drafts/queues and cached private responses are included, not forgotten shadows.
- Minimal deletion evidence may retain opaque former Account ID, request/completion timestamps, policy version and job result under R6/R8; no email/content unless counsel documents necessity.
- Backup archives are not rewritten record-by-record. They remain encrypted/restricted, expire under R7 and cannot return data to production without replaying the deletion ledger.
- A legal hold is exceptional, scoped, access-restricted, reviewed and disclosed as law permits. It does not permit normal product use.

Soft deletion for individual records is not the same as Account deletion. Individual recovery windows must not delay an Account purge.

## Logs, metrics and observability

### Allowed fields

- timestamp, environment/service, correlation ID;
- authenticated Account UUID only when needed for security investigation, otherwise pseudonymous/absent;
- route template (`/tasks/{id}`), method, safe status/error code, latency;
- security event type, rate-limit result, session-event ID, truncated/generalized network metadata where compatible with incident obligations;
- job type/status/attempt and non-sensitive record UUID;
- deployment/config version and infrastructure health.

### Prohibited fields

- password, cookies, authorization/CSRF/session/reset/verification tokens;
- request/response bodies and form values;
- email except an irreversible keyed hash when a documented operational purpose requires correlation;
- Task/Project/Goal titles, Note/Brain Dump/comment/review text;
- search queries, attachment names/content, export content;
- full URLs when query/fragment/private IDs can be removed; referrers crossing private routes;
- SMTP body or signed download/file URLs.

Access is least privilege, audited and limited to incident/operations need. Development fixtures contain no production data. Production data is never copied to local development.

## Backups and restoration

- Encrypt backups before leaving the database/VPS trust boundary; keys are separate from backup objects.
- Use a distinct LifeOS backup prefix/account/credentials and destination inventory.
- Nightly database backup plus optional file metadata/content only after file gate; target R7 maximum 35 days.
- Backup provider region, DPA/subprocessors, deletion and restore access are launch decisions.
- Quarterly restore into an isolated non-production environment; restrict access and destroy the restore after verification.
- Validate user ownership, record counts, migrations and deletion-ledger replay before a restored system can serve traffic.
- Alert on missed backup, age, integrity/encryption failure and deletion failure.
- RPO/RTO values remain an infrastructure ticket decision; the privacy notice must not promise them prematurely.

## Email lifecycle

### Required identity/security mail

Verification, password reset, password changed, new/revoked session, export ready and deletion/security notices use minimum recipient/content and no tracking pixel. Links use single-use/short-lived tokens or authenticated destinations and never expose secrets in provider metadata/logs beyond delivery need.

### Optional productivity mail

Reminder/summary email is disabled at launch unless its optional gate passes:

- separate opt-in, category/frequency/quiet-hour controls and one-step unsubscribe;
- private-content preview off by default;
- no provider use for advertising/training;
- sender/domain authentication and suppression handling;
- retention/DPA/subprocessor/region review;
- withdrawal propagated promptly without stopping mandatory security mail.

Outbox payloads are erased after delivery/final failure under R1/R5. Store only minimum delivery/audit status; configure the SMTP provider's shortest workable message/log retention.

## Optional attachments

The Files capability remains absent when disabled. Before enabling:

- approve storage/scanning/quarantine architecture, region, quotas, types and maximum size;
- private randomized object keys; no public buckets or stable public URLs;
- authorize every upload/download/delete against Account and owning record;
- validate MIME/content, scan before availability and prevent active-content execution;
- avoid collecting unnecessary EXIF/metadata; document whether safe stripping occurs;
- failed/incomplete upload cleanup within 24 hours; quarantined item cleanup within 7 days unless investigation requires documented hold;
- parent/archive/delete/export/backups all propagate to attachment metadata/content;
- signed download URLs expire quickly and are never logged.

## Future AI boundary

No LifeOS private content is sent to an AI model/provider in v1. Before any AI ticket leaves discovery:

1. define the exact user-requested purpose and non-AI fallback;
2. minimize selected context and show what will be sent;
3. obtain separate opt-in/confirmation appropriate to the purpose;
4. complete provider DPA, subprocessors, countries/transfers, security and incident review;
5. contractually disable provider/model training and set zero/short retention where available;
6. protect against prompt injection/data exfiltration and never grant autonomous broad Account access;
7. store prompt/output only when the user deliberately saves it; include it in export/deletion;
8. label output as a proposal, show source/basis and require confirmation before mutations;
9. evaluate privacy leakage, correctness and deletion end to end;
10. update the privacy notice and this inventory before production.

## Processor and transfer register

No vendor is approved merely because it is named in architecture.

| Processor/service | Role/data | Required pre-production evidence | Status |
| --- | --- | --- | --- |
| Cloudflare | DNS/proxy/TLS/WAF; IP/request/security metadata | Account owner, DPA/terms, services, subprocessors, countries, retention/log controls, cache bypass, deletion/contact | Selected technology; legal/config review pending |
| VPS provider | Compute/network/storage; encrypted/live traffic and infrastructure metadata | Legal entity, country/data center, DPA/terms, access/support, disk disposal, incident notice, backups, CERT-In implications | Provider/details unknown |
| PostgreSQL | Primary LifeOS private data | Self-hosted container/database boundary, encryption/access/backups, role/audit | Planned self-hosted |
| SMTP provider | Recipient, template content, delivery metadata | Provider/DPA, region, subprocessors, retention, tracking off, security, deletion/suppression | Unknown |
| Backup destination | Encrypted database/optional file archives | Provider/DPA, region, keys, retention lock/deletion, access audit, restore/export | Unknown |
| Monitoring/error service | Operational/security metadata | Prefer self-hosted/minimized; DPA/region/retention/scrubbing if external | Unknown; no third-party SDK approved |
| File store/scanner | Optional file content/metadata | ADR, DPA, region, scan handling, retention/deletion/export | Off |
| AI provider | Future selected content/prompt/output | Dedicated privacy/security/AI ADR and opt-in controls | Prohibited/off |

Maintain legal entity, service, purpose, data categories, locations, transfer mechanism, subprocessors, contract version, security evidence, retention/deletion, incident contact, owner and review date for each enabled processor.

## Incident and breach readiness

- One named incident lead and backup, current privacy contact, CERT-In point-of-contact decision and processor emergency contacts.
- Preserve evidence without expanding routine content logging.
- Classify affected data/accounts, stop exposure, rotate/revoke secrets and document timeline/decisions.
- Meet the shortest applicable notification deadline. If CERT-In directions apply, listed incidents use the six-hour reporting clock; when relevant DPDP Rules commence, affected-person notice and Board reporting requirements also apply; GDPR/other jurisdiction clocks may be different.
- User notice follows the content guide: what happened, likely relevant consequences, mitigation, user actions and contact—without speculation or exposing another user.
- Test incident tabletop before launch and at least annually; include Cloudflare/VPS/SMTP/backup compromise and restore/deletion scenarios.

## Launch blockers and named owners

| Blocker/decision | Owner/ticket | Unblocks when |
| --- | --- | --- |
| Legal operator/controller identity and privacy/grievance contact | Owner + LOS-0114/LOS-1614 | Verified publishable values recorded |
| Applicable-law review including DPDP commencement/CERT-In/operator form | Owner/legal + LOS-0114/LOS-1515 | Written scope/deadlines/log requirements recorded |
| VPS, backup, SMTP, monitoring provider/regions/contracts | LOS-0008, LOS-1402, LOS-1601, LOS-1604, LOS-1608 | Processor register entries complete |
| Exact session/token/email/privacy-request retention | LOS-0501–LOS-0507, LOS-1402, LOS-0517–LOS-0519 | Schema/job/policy tests match approved classes |
| Account deletion grace and backup expiry implementation | LOS-0518, LOS-1608 | Jobs, restore, policy and tests match the accepted 30/35-day defaults or a superseding ADR |
| Privacy notice/terms and versioned consent UI | LOS-0503, LOS-0509, LOS-1614 | Counsel-reviewed copy matches implementation |
| Export schema/deletion propagation | LOS-0517–LOS-0519, LOS-1512 | Automated cross-user/completeness/purge tests pass |
| Incident contact/reporting runbook | LOS-1504, LOS-1610, LOS-1613 | Tabletop proves applicable clocks/contact paths |
| Attachments | LOS-1309–LOS-1311 | Optional gate accepted; otherwise hidden |
| AI | LOS-1704/LOS-1705 future discovery | Dedicated ADR/gate; otherwise no provider call |

## Privacy acceptance checklist

- [ ] Every persisted or transmitted personal-data field maps to this inventory and purpose.
- [ ] No third-party SDK/provider is present without processor-register evidence.
- [ ] Production locations/transfers and legal operator/contact are published accurately.
- [ ] Required/optional consent and withdrawal are separate, versioned and tested.
- [ ] Adults-only/child handling and launch geography are explicit.
- [ ] Export is complete, private, short-lived and excludes security secrets.
- [ ] Account deletion covers live/derived/device/provider data and survives backup restore.
- [ ] Retention jobs prove R1–R8 boundaries and legal-hold exceptions.
- [ ] Logs are content-free, access-controlled and stored for the approved legal period/location.
- [ ] Cloudflare/API/private routes never cache or expose one Account's data to another.
- [ ] Security/identity email has no tracking; optional reminders remain off without opt-in.
- [ ] Files and AI are absent unless their gates and updated notices pass.
- [ ] Incident runbook meets the shortest applicable reporting/notification clock.
- [ ] Privacy notice and UI copy describe actual implementation, not future promises.

## Source revalidation

Recheck these official sources during LOS-1614/LOS-1515 and immediately before launch:

- [India Code — Digital Personal Data Protection Act, 2023 and linked Rules/notifications](https://www.indiacode.nic.in/handle/123456789/22037)
- [Official Digital Personal Data Protection Rules, 2025 PDF](https://upload.indiacode.nic.in/showfile?actid=AC_CEN_45_0_00003_2023-22_1763464807080&filename=dpdprules2025.pdf&type=rule)
- [CERT-In cyber-security Directions under section 70B](https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf)
- [EUR-Lex — GDPR official text](https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=EN)
- [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/)
- [Cloudflare data processing/SCC terms](https://www.cloudflare.com/en-gb/cloudflare-customer-scc/)

Record source date, changed requirements, reviewer and resulting ticket/ADR. Do not copy policy language from a template or vendor without matching actual LifeOS data flow.
