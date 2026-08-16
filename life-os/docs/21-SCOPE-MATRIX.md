# LifeOS scope matrix

This freezes the planning boundary for the first production release. Moving an item between categories requires an owner decision, backlog update and—when architecture/security changes—an ADR.

## Required for LifeOS v1.0

### Trust and account

- Signup, email verification, login/logout, recovery, secure sessions and CSRF.
- Onboarding, profile/timezone/week/focus defaults, session security settings.
- Privacy/terms, account data export and account deletion lifecycle following `31-PRIVACY-DATA-LIFECYCLE.md`.
- Per-user authorization, audit, rate limits, security notifications and safe errors.

### Daily execution

- Responsive private shell, navigation, Today dashboard, Quick Add and global focus state.
- Projects/list/details, milestones, progress, health and activity.
- Tasks/list/details, subtasks, dependencies, labels, priorities, MIT, bulk actions, personal comments and activity.
- Time Blocks day/week planning, conflicts, Calendar day/week/month and Focus Mode.
- Recurring tasks with series/occurrence editing and timezone/DST safety.

### Planning, growth and reflection

- Sprints, Week Planner, daily/weekly/monthly reviews.
- Goals/check-ins/linked work.
- Notes, Brain Dump conversion and Habits.
- Progress and reports with accessible numbers/tables/charts and CSV export.
- Global search, in-app notifications and settings/preferences.

### Quality and operations

- Mobile/tablet/desktop, WCAG 2.2 AA core workflows and defined browser support.
- Online-first resilience: cached shell/read state where safe, local drafts and explicitly queued safe creates after the offline queue tickets.
- OpenAPI, tests, observability, background jobs/mail, migrations and performance budgets.
- VPS Docker Compose, Caddy, Cloudflare, staging, backups/restore, monitoring, rollback and production launch.

## Optional v1 launch gates

These ship only if their dedicated gate passes. Their absence cannot break required workflows.

| Capability | Ship condition | Fallback if deferred |
| --- | --- | --- |
| Private attachments | Storage/quota/scanning/authorization/backup ADR and security tests pass. | Hide file tabs/actions; task/project core remains complete. |
| PDF report export | Layout/privacy/accessibility/expiry QA passes after CSV. | CSV and print-friendly report remain available. |
| Installable PWA/app-shell caching | No private cross-account cache leakage and update/logout behavior passes. | Standard online web application. |
| Offline mutation queue | Idempotency/conflict/account-switch tests pass for the explicitly allowed creates. | Preserve local drafts; require connection to save. |
| Productivity reminder email | SMTP preferences/quiet-hours/deliverability pass. | Identity/security mail only; in-app reminders remain. |

## Explicitly future—not v1 launch dependencies

- Teams/workspaces, roles, invitations, assignments, sharing, mentions and collaboration threads.
- AI categorization, planning, summarization, natural-language search or autonomous agents.
- External Google/Outlook calendar sync.
- Native iOS/Android/desktop applications and browser/mobile push.
- Full offline-first editing/sync of every entity and multi-device merge automation.
- Public API, webhooks, automation rules, plugins/integrations.
- Voice capture/transcription, OCR and rich attachment intelligence.
- Public sharing, templates marketplace, billing/subscriptions and organization administration.
- Rich collaborative document editing and indefinite revision history.

## Scope-change rule

1. State the user/job evidence and why the current category is insufficient.
2. Identify tickets, phase gate, data/security/operations and timeline impact.
3. Remove or defer equivalent effort when expanding a fixed release.
4. Update this matrix, product specification, roadmap, status ledger and affected tickets.
5. Do not treat a visually present reference feature as automatically in scope.
