# LifeOS onboarding specification

## Outcome

A newly verified user reaches a truthful, useful Today screen in under two minutes with the minimum settings needed to interpret dates and plans correctly. Onboarding gathers only what improves the product now, saves after every step, can be resumed, and allows all nonessential choices to be skipped.

## Entry and exit

- Entry: successful email verification/login for an account whose onboarding is incomplete.
- Route: `/life-os/app/onboarding`; it is authenticated but uses a focused layout rather than the full application shell.
- Exit: `/life-os/app/today` after required timezone confirmation and explicit Finish or Start empty.
- An authenticated user may return from Settings to change every onboarding preference later.
- A user may leave/reload and resumes the first incomplete required step or last saved optional step.

## Required versus optional

| Setting | Requirement | Default/skip behavior |
| --- | --- | --- |
| Display name | Collected at signup; editable | Existing value remains. |
| Timezone | Required confirmation | Suggest browser IANA timezone; allow search; “Use UTC for now” is an explicit valid choice. |
| Week start | Optional confirmation | Suggest locale-based value, with Monday as deterministic fallback. |
| Locale/date/time format | Optional | Browser locale suggestion; server-supported fallback. |
| Working days/hours | Optional | No capacity assumption when skipped; planner explains how to add later. |
| Daily focus target | Optional | No target metric when skipped; reports show actual time only. |
| Focus/break durations | Optional | Product defaults 25/5 minutes, clearly editable and not presented as universally optimal. |
| Starter records | Optional and explicit | Default is Start empty; never create fake projects/tasks/habits silently. |
| Notifications | Optional later prompt | No browser permission dialog during first onboarding; explain and ask contextually when a reminder is first enabled. |

## Step flow

### Step 1 — Welcome and privacy

Content:

- “Welcome to LifeOS” and a short statement: private planning, execution and review in one place.
- Confirm display name; show the verified email read-only with a link to account help, not an edit shortcut that bypasses verification.
- Explain that the user can start empty and change preferences later.

Primary action: Continue. Secondary action: Sign out.

### Step 2 — Time and week

Fields:

- Timezone search/combobox showing IANA name and current local time.
- Week starts Monday/Sunday/Saturday according to supported options.
- Locale/date display preview and 12/24-hour preference when supported.

Validation:

- Timezone must be a server-supported IANA identifier or explicit UTC.
- Preview shows “Your Today is …” and a sample local block time.
- Browser timezone is only a suggestion and is not saved before confirmation.

Primary action: Save and continue. Back preserves values.

### Step 3 — Planning defaults (optional)

Fields:

- Working days.
- Typical work start/end local time; overnight schedules are allowed only through an explicit “ends next day” control.
- Optional daily focus target.
- Default focus and break durations.

Actions: Save and continue; Skip for now. Skipping does not manufacture capacity or a missed goal.

### Step 4 — Start LifeOS

Choose one:

1. Start empty — recommended/default, opens an honest empty Today screen.
2. Create first task — compact title/optional date; creates one real task after confirmation.
3. Create first project — compact name/outcome; creates one real project after confirmation.
4. Capture something — creates one Brain Dump item.

No option creates sample habits, schedules, goals or fake progress. Creation uses the same validated/idempotent services as the final Quick Add flows. If those domain services are not available in the current release, only Start empty is shown.

Primary action: Finish setup. Completion records the onboarding version and timestamp.

## Persistence contract

The backend is authoritative and stores:

- onboarding version;
- state: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`;
- last completed/visited step identifier;
- completion timestamp;
- confirmed timezone and optional preferences in their canonical user-preference fields.

Each step saves independently with optimistic versioning. The frontend may keep an unsaved field draft, but must not claim Saved until server acknowledgement. A new onboarding version adds migration/prompts only for newly required settings; it does not erase completed state.

## Resume, skip and failure rules

- Refresh/relogin returns to the first unresolved required step or last saved optional step.
- Back never deletes a previously saved preference; editing saves a new version.
- Skip applies only to explicitly optional steps/fields and is logged as a product choice, not failure.
- A failed step preserves inputs, identifies the affected fields or service state, and offers Retry.
- Session expiry preserves a safe local draft, returns through login and restores the intended onboarding step after authentication.
- If the optional starter-record request times out after server commit, idempotency prevents duplicates and the resume state links to the existing record.
- If preference and starter record operations partially fail, onboarding completion reflects exactly what was saved and offers retry/open Today rather than rolling back unrelated successful preferences.

## Timezone-change warning

Changing timezone during onboarding only affects display/input interpretation because no scheduled data should normally exist. If records already exist through Quick Add/API/import, show a concise warning that instants stay fixed while local dates/times may display differently. Detailed timezone migration behavior belongs to Settings/domain tickets.

## Responsive behavior

- Mobile: one step per screen, sticky primary action above safe area, no horizontal stepper; progress is text such as “Step 2 of 4”.
- Tablet/desktop: centered form surface with optional compact progress rail; do not use the full dense app dashboard.
- Forms remain usable at 320 CSS px and 200% zoom.

## Accessibility

- One page heading and one step heading; progress is announced once on navigation.
- Focus enters the step heading or first invalid field after submit; Back/Continue order is consistent.
- Every field has visible label, description and linked error; examples are not placeholder-only.
- Timezone search supports keyboard, typeahead, loading/no-result/error and a native/manual fallback.
- Reduced motion removes step transitions; no auto-advancing step.
- Error summary links to invalid fields and preserves all values.

## Analytics and privacy

Product telemetry, if later approved, may record step reached, completion/skip and elapsed buckets without email, display name, exact work hours or text content. Onboarding functions fully without analytics.

## Acceptance criteria

- Required timezone is explicitly confirmed; all other setup choices may be skipped or deferred.
- A user can complete the default path in under two minutes and reaches `/app/today` with no fake records.
- Each step is saved/resumable; refresh, sign-out/in, validation error and service failure do not lose acknowledged work.
- Optional starter creation is explicit, idempotent and hidden until its real domain service exists.
- Mobile, keyboard, screen-reader, zoom, locale and invalid/unsupported timezone cases pass.
- Every saved setting is editable later in Settings using the same canonical data.

