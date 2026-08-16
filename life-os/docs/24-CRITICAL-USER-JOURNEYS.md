# Critical user journeys

Each journey names the happy path, the state that must remain canonical, and recovery behavior. Detailed screen wireframes and API contracts must implement these journeys without inventing duplicate records.

## Journey 1 — First secure entry

1. Anonymous visitor opens `/life-os` and chooses Sign up.
2. User enters display name, email, password and accepts the current terms/privacy versions.
3. LifeOS creates an unverified account and sends one verification message.
4. User verifies through a single-use link, signs in and confirms timezone/week start/work hours/focus defaults.
5. User reaches an honest sparse Today screen with Quick Add and suggested first actions.

Recovery:

- Duplicate/unknown account responses avoid enumeration.
- Expired/used verification links offer safe resend/login paths.
- Interrupted onboarding resumes; optional steps can be skipped.
- No private shell/data is available to anonymous or unverified users.

## Journey 2 — Project to focused completion

1. User creates a project with outcome, priority and optional deadline.
2. User adds a task and subtasks, then marks it as today's MIT.
3. User schedules the task as a Time Block; overlap is resolved explicitly.
4. At block time, user starts Focus Mode from Today/task/block.
5. Focus session survives refresh/background sleep and records actual time once.
6. User completes the task; project/task/Today/calendar/progress views reconcile.

Recovery:

- Lost create response is idempotent and does not duplicate the project/task/block/session.
- Stale edits preserve local changes and show conflict choices.
- If focus disconnects, server state/time is authoritative and one active session remains.
- Completing a project never silently deletes unfinished work.

## Journey 3 — Capture without losing focus

1. While working, user opens Quick Add/Brain Dump by keyboard or touch.
2. User types a thought and saves in seconds.
3. LifeOS shows Saved only after server acknowledgement, or Queued/Device draft honestly when offline support is active.
4. Later, user processes the item into a task, note, project idea or goal.
5. Conversion links the source and destination and occurs once.

Recovery:

- Closing/reload/offline never presents unsent work as Saved.
- Retry after response loss is idempotent.
- Batch triage reports partial failures without losing successful conversions or unprocessed text.

## Journey 4 — Re-plan a disrupted day/week

1. User opens Today or Week Planner and sees capacity, blocks, tasks and conflicts.
2. User reschedules/moves a task or block, intentionally resolves overlaps and changes MIT if priorities changed.
3. User carries, drops or reassigns unfinished work rather than letting it silently accumulate.
4. Calendar and relevant plans update from the same records.

Recovery:

- Drag has keyboard/touch form alternatives.
- DST-invalid/ambiguous times and midnight boundaries require explicit resolution.
- Concurrent plan changes show a version conflict, not last-write-wins loss.
- Offline mode disables unsafe recurrence/bulk/dependency actions and preserves safe drafts.

## Journey 5 — Daily, weekly and monthly review

1. User starts the relevant review from Today/Reviews.
2. LifeOS shows an understandable metric snapshot and source links.
3. User records reflection and makes explicit completion/carry-over/next-plan decisions.
4. Draft can be saved/resumed; finalize stores an immutable snapshot.
5. Later source edits do not rewrite what the historical review reported.

Recovery:

- Review may be skipped without blocking LifeOS or using guilt language.
- Missing/partial history is stated rather than estimated.
- Finalize retry cannot duplicate carry-over or review records.

## Journey 6 — Recurring responsibility across time boundaries

1. User creates a recurring task with cadence, timezone and end rule.
2. LifeOS generates each occurrence once and shows it in Tasks/Calendar/Today when relevant.
3. User completes/skips an occurrence or edits this/this-and-future/series.
4. History and future occurrences match the selected scope.

Recovery:

- DST, month end, leap day, timezone change and job retry remain deterministic.
- Skipped/deleted exceptions do not reappear.
- Series edits unavailable offline explain why and preserve the intended change as a draft only if safe.

## Journey 7 — Recover account and control personal data

1. User requests password recovery and receives a generic public response.
2. Single-use reset updates the password, revokes required sessions and sends a security notice.
3. In Settings, user can inspect/revoke sessions, request a private export and request account deletion.
4. Export completes as a short-lived authorized download; deletion follows explicit grace/cancel/purge policy.

Recovery:

- Unknown email, expired/used token and repeated requests do not reveal account existence.
- Failed export/job is visible and retryable without public file exposure.
- Deletion cannot leave an active session or allow cached private data after logout.

## Journey 8 — Search and open canonical context

1. User opens global search and enters a private query.
2. Results group canonical projects, tasks, notes, brain-dump items, goals and habits.
3. Keyboard/touch selection opens the exact record and later returns to preserved list/search context.

Recovery:

- Search never crosses users and query/note bodies are not logged.
- No result provides filter guidance and Quick Add; failed search preserves the query safely.
- Deleted/archived results use safe fallback/restore behavior rather than broken details.

## Journey acceptance

- Each journey has one canonical data path and explicit ownership/security boundary.
- Loading, empty, error, offline, conflict, retry and destructive states are named.
- Every drag, icon-only or pointer-first step has a keyboard/touch/accessibility path.
- Each journey maps to the product acceptance and QA matrices before its screen/API tickets become Ready.

