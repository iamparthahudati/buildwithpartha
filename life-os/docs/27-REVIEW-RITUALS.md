# Daily, weekly and monthly review rituals

## Principle

Reviews help the user notice, decide and adjust. They are never a score of personal worth, never block LifeOS, and never manufacture conclusions from missing data. Every review can be started, saved as draft, resumed, finalized or skipped with a neutral reason.

## Shared review state

- Period identity uses the user's timezone and configured week start.
- States: `NOT_STARTED`, `DRAFT`, `FINALIZED`, `SKIPPED`.
- A finalized review stores an immutable metric snapshot plus the user's structured/text answers.
- Source records may change later; history continues to show the original snapshot with links to current records where safe.
- Finalize, carry-over and related actions are transactional/idempotent so retry cannot duplicate work.
- Reopen after finalization is not allowed by default; a correction creates a documented revision or explicit new decision after its ticket defines the audit model.

## Morning review

Target time: 3–5 minutes. Available from Today when appropriate, but never modal-blocking.

### Step 1 — Orient

Show local date, existing appointments/time blocks, tasks due/planned, overdue count and any active sprint/week outcomes. State data freshness and partial failures.

Prompt: “What already has a place in your day?”

### Step 2 — Choose focus

- Select or change one MIT from eligible tasks, or create a task.
- If no task is suitable, allow “No MIT today” with optional note; do not mark failure.
- Show priority, deadline and blockers without changing them automatically.

Prompt: “If one thing moves forward today, what should it be?”

### Step 3 — Check the plan

- Review scheduled versus available time and conflicts.
- Add/move blocks through canonical scheduling controls.
- Identify one realistic next action after MIT when useful.

Prompt: “Is this plan possible with the time you have?”

### Step 4 — Commit or save draft

Optional intention text, then Finish morning review. Store MIT/plan mutations and review snapshot once.

## Evening review

Target time: 5–10 minutes.

### Step 1 — Notice

Show completed/planned tasks, focus planned versus actual, time categories, unfinished/overdue items and relevant habit entries. Missing data is labelled.

Prompt: “What moved forward today?”

### Step 2 — Resolve unfinished work

For each selected unfinished item: keep for tomorrow, schedule another date/block, return to backlog, mark blocked, complete/cancel if accurate. Bulk choices show exact effect and partial failures.

Prompt: “What deserves another place, and what can be released?”

### Step 3 — Reflect

Optional fields:

- Win or progress.
- Friction/interruption.
- Lesson or note for tomorrow.
- Energy/mood only if explicitly enabled in a later privacy-reviewed feature; not required in v1.

### Step 4 — Preview tomorrow

Show tomorrow's known blocks/due tasks and optional candidate MIT, without forcing a commitment. Finish stores the snapshot and deliberate carry-over actions transactionally.

## Weekly review

Target time: 20–30 minutes. Period follows configured week start.

### Step 1 — Clear capture points

Review unprocessed Brain Dump items, task inbox/projectless tasks, unscheduled overdue work and failed/queued offline actions. “Clear” means deliberately processed/deferred/kept, not necessarily zero.

### Step 2 — Review the week

Show:

- committed versus completed/cancelled/carried tasks;
- planned versus actual focus/time allocation;
- sprint scope/completion if active;
- project health/deadline changes;
- goal check-ins and habit consistency;
- daily review completion as context, not a compliance score.

Prompts:

- “What created meaningful progress?”
- “What repeatedly got in the way?”
- “What should change next week?”

### Step 3 — Check projects and goals

Open each project/goal needing attention: choose next task, update health/status/date, pause/archive or leave unchanged. Do not require reviewing stable items.

### Step 4 — Plan the next week

- Choose up to a small, configurable number of weekly outcomes.
- Confirm capacity/work hours/known blocks.
- Select/carry tasks intentionally and resolve obvious overcapacity/conflicts.
- Create/update Weekly Plan through canonical services.

### Step 5 — Finalize

Store metrics, answers, outcome/plan decisions and a concise generated factual summary assembled from structured data—not AI. Offer Open Week Planner.

## Monthly review

Target time: 30–45 minutes. Month boundaries use local timezone.

### Step 1 — Outcomes and allocation

Show completed/cancelled/carried work, focus/time categories, projects started/completed/paused, goals and habits. Missing weeks remain missing; no interpolation.

### Step 2 — Project and goal decisions

Identify projects/goals with major progress, stalled state, deadline risk or no next action. User chooses continue/change/pause/complete/archive through canonical controls.

### Step 3 — Reflect

Optional prompts:

- Highlights: “What are you glad moved forward?”
- Challenges: “What deserves attention or support?”
- Stop: “What no longer earns time?”
- Start: “What would make next month easier or more meaningful?”
- Continue: “What is working well enough to protect?”

### Step 4 — Set direction

Choose a small set of next-month themes/outcomes. These are planning context, not automatically created goals/tasks unless the user explicitly converts them.

## Skip, reminders and resume

- Skip choices: Not useful now, No time, Not enough data, Already reviewed elsewhere, Other optional note.
- Skip is reversible before the period closes and never blocks current/future reviews.
- Reminder frequency is user-configurable; repeated prompts stop after skip/finalize and respect quiet hours.
- Draft saves after meaningful steps and shows last saved time; unsaved text uses the standard draft/offline/conflict language.
- If session expires, safe draft is retained and restored after login.

## Error and partial-data behavior

- Snapshot source failure identifies unavailable sections; user may retry or continue with an explicitly partial snapshot.
- Carry-over/schedule/project changes show per-action result and remain idempotent.
- A finalize failure leaves the review in Draft with all acknowledged mutations/saved answers visible; it never claims completion.
- Stale review draft shows compare/reload/copy choices rather than silent overwrite.
- Deleting/archiving a source later leaves readable historical labels/fallbacks without exposing another user's data.

## Copy and emotional safety

Use: “Review”, “notice”, “decide”, “carry forward”, “release”, “not enough data”.

Avoid: “failed”, “lazy”, “perfect week”, “you broke your streak”, “productivity score”, red overdue totals as the emotional center, or celebratory language that assumes more hours equals better life.

Progress statements name the measure: “4 of 6 planned tasks completed” rather than “You were 67% productive.”

## Accessibility and responsive behavior

- Step flow has descriptive headings, progress text and Save status; no auto-advance.
- Metric charts include values/table summaries and source links.
- Batch carry-over and planning have non-drag keyboard/touch controls.
- Focus moves to step heading/error summary; returning to a source record preserves draft/review context.
- Mobile presents one review section at a time with a persistent but non-covering Save/Continue area.
- 200% zoom, reduced motion and long/Unicode answers are supported.

## Acceptance criteria

- Morning, evening, weekly and monthly review prompts, expected duration and structured decisions are defined.
- Draft/resume/skip/finalize and immutable snapshot behavior is consistent across periods.
- Review mutations are canonical, transactional/idempotent and cannot duplicate carry-over.
- Missing/partial data is honest; review never blocks access or uses guilt/scoring language.
- Mobile, keyboard, screen-reader, zoom, offline draft, auth expiry and stale conflict behavior are covered.

