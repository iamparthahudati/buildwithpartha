## Ticket

- LifeOS ticket: LOS-####
- Epic:
- Base branch: `develop` (or explain release/hotfix exception)

## Outcome

Describe the user-visible or engineering result, not only files changed.

## Acceptance criteria

- [ ] Every ticket acceptance criterion is met.
- [ ] Loading, empty, error, permission, conflict, offline and responsive states were handled where applicable.
- [ ] No unrelated behavior or undocumented contract change is included.

## Validation

- [ ] Formatting/lint/typecheck or Java compile passes.
- [ ] Relevant unit tests pass.
- [ ] Relevant integration/contract/end-to-end tests pass.
- [ ] Production build passes.
- [ ] Security, privacy and cross-user tests were added where applicable.
- [ ] Keyboard, focus, zoom, mobile and accessibility behavior was checked where applicable.

List exact checks and results:

## Database, configuration and deployment

- Migration/config/environment change:
- Backward compatibility:
- Rollback:

## Dependency integrity

- [ ] Dependency manifests, lockfiles and wrappers are unchanged; or this is a dedicated dependency/security ticket and every generated lock change is reviewed.
- [ ] Platform, runtime and build-tool versions were not silently changed.

## Evidence

Add screenshots only when visual comparison helps. Do not include personal data or secrets.

## Documentation and handoff

- [ ] Permanent docs/contracts are updated.
- [ ] `life-os/docs/CURRENT-STATUS.md` is updated.
- [ ] `life-os/docs/handoffs/LOS-####.md` is added.
