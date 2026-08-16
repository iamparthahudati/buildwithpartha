# Definition of done

A ticket is Done only when every applicable item is true.

## Scope and behavior

- Acceptance criteria pass and no unrelated behavior changed.
- Dependencies are complete; assumptions and deviations are documented.
- Loading, empty, error, success, disabled, and destructive states are handled where applicable.
- Copy and fixtures use LifeOS identity and no reference-product data.

## Engineering quality

- Code follows the documented folder/module boundaries and contains no avoidable duplication.
- Formatting, lint, typecheck/compile, unit tests, integration tests, and production build pass.
- New APIs include OpenAPI updates and contract tests; new schema changes include reviewed Flyway migrations.
- No secrets, debug output, dead feature flags, or unexplained TODOs were added.

## Security and privacy

- Backend authorization and cross-user negative tests exist for user-owned data.
- Validation, CSRF, session, logging/redaction, and rate-limit requirements are satisfied.
- Security-sensitive change includes threat/abuse cases in tests or ticket notes.

## User experience

- Keyboard, focus order, accessible name/description, contrast, zoom, reduced motion, mobile, tablet, and desktop were checked as applicable.
- Dates/times were tested around timezone/day boundaries.
- Performance impact and large-data behavior were considered.

## Delivery hygiene

- Ticket/PR uses the correct ID and branch.
- Documentation and `CURRENT-STATUS.md` are current.
- `docs/handoffs/LOS-####.md` records changes, checks, config/migrations, limitations, and next ticket.
- Reviewer can reproduce the result from the documented setup.

