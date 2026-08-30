# Habit streak and cadence calculation rules

Ticket: LOS-1210
Status: Done

This document is the canonical specification for every streak, cadence-eligibility, pause-exclusion, completion-rate, and rounding decision in LifeOS Habits. The `HabitStreakCalculator` domain service in `habit/domain` implements these rules exactly. Any deviation from this document must be recorded as an ADR before implementation.

---

## 1. Concepts and terminology

| Term | Definition |
| --- | --- |
| **Period** | The atomic unit of measurement for a cadence. One day for DAILY; one ISO week for WEEKLY; one calendar month for MONTHLY. |
| **Eligible period** | A period that is not fully paused; one that a user is expected to act on. |
| **Paused period** | A period where every calendar day is covered by at least one pause period; excluded from all streak and rate calculations. |
| **Target met** | The sum of `completedCount` across all Habit Entries whose `localDate` falls within the period is ≥ `habit.targetCount`. |
| **Streak** | A contiguous sequence of consecutive eligible periods that each met the target. |
| **Completion rate** | `metTargetPeriods / eligiblePeriods`; the fraction of eligible periods in a window that met the target. |

---

## 2. Period grid by cadence

### 2.1 DAILY

Each calendar date in the window `[from, to]` (inclusive) is one period. A period starts and ends on the same date.

```
2026-02-01  →  period [2026-02-01, 2026-02-01]
2026-02-02  →  period [2026-02-02, 2026-02-02]
…
```

`targetCount` is the number of completions required on that single date.

### 2.2 WEEKLY

Periods follow **ISO week boundaries** (Monday = first day of week, Sunday = last). A period covers the portion of the ISO week that overlaps the requested window.

```
Window 2026-02-04 → 2026-02-10  (Wed → Tue spanning two ISO weeks):
  Period 1: [2026-02-04, 2026-02-08]   (Wed–Sun, clipped to window start)
  Period 2: [2026-02-09, 2026-02-10]   (Mon–Tue, clipped to window end)
```

`targetCount` is the number of completions required **across the entire week** (or the clipped portion if the window cuts the week). Because a partially-windowed week uses the full `targetCount` denominator, a window that clips a week may make that week harder to achieve; callers that display "this week" stats should use the full week.

### 2.3 MONTHLY

Periods follow calendar months. A period covers the portion of the month that overlaps the requested window.

```
Window 2026-01-15 → 2026-02-10:
  Period 1: [2026-01-15, 2026-01-31]   (clipped to window start)
  Period 2: [2026-02-01, 2026-02-10]   (clipped to window end)
```

`targetCount` is the number of completions required across the month. The same clipping note applies as for WEEKLY.

---

## 3. Pause exclusion

### 3.1 Definition

A Habit Pause Period stores an inclusive date range `[startDate, endDate]`. An open-ended pause has no `endDate` and covers all dates from `startDate` indefinitely.

A calendar date is **paused** when it is covered (`HabitPausePeriod.covers(date)` returns true) by at least one active pause period for the habit.

A **period is paused** (and therefore excluded) when **every** calendar day in the period is paused. Partly-paused periods remain eligible.

### 3.2 Streak visibility

Paused periods are **invisible** to the streak counter. They do not extend or break a streak; they simply do not participate.

```
Periods (daily, target=1):
  Day 1 → met        streak = 1
  Day 2 → paused     streak = 1  (unchanged)
  Day 3 → met        streak = 2  (continues from Day 1)
  Day 4 → miss       streak = 0  (broken by Day 4, not Day 2)
```

### 3.3 Partly-paused periods

If a period contains at least one non-paused day, it is eligible. The user is expected to record completions on the non-paused days. Paused days within the period are **not automatically credited**: only recorded Habit Entries count toward the target.

---

## 4. Target evaluation

A period is **met** when:

```
sum(entry.completedCount for all entries where entry.localDate ∈ period) >= habit.targetCount
```

Rules:
- Entries are matched by the stored `localDate`, not by the instant they were created.
- Multiple entries on the same `localDate` (recorded by repeated increments) are **summed**.
- An entry with `completedCount = n` counts as `n` completions.
- An entry whose `localDate` falls outside the window is **ignored** by the calculator.
- Missing entry (no row for that date) counts as 0 completions.

---

## 5. Streak calculations

### 5.1 Current streak

Scan eligible periods from **last to first** (most recent to oldest) within the window.

- For each eligible period (skip paused): if it met the target, add 1.
- At the first miss, stop and return the count accumulated so far.
- If the last eligible period in the window is a miss, `currentStreak = 0`.

### 5.2 Longest streak

Scan eligible periods in **chronological order**. Maintain a running counter:

- Met: `runningCounter++`. If `runningCounter > longestStreak` update `longestStreak`.
- Miss: `runningCounter = 0`.

Return `longestStreak` after the full scan.

### 5.3 Eligible and met counts

`eligiblePeriods` = count of periods not fully paused in the window.
`metTargetPeriods` = count of eligible periods that passed the target evaluation.

---

## 6. Late-edit semantics

An entry backdated to a past local date is **stored with that past date** (the API allows `PUT /habits/{habitId}/entries` with an explicit `localDate`). The calculator treats it identically to an entry recorded on that day.

**Effect**: a late edit that brings a past period's total to ≥ `targetCount` repairs the streak retroactively. The UI and statistics reflect the corrected history immediately, with no separate "amended" flag.

> [!NOTE]
> Retroactive repair is intentional behavior. A user correcting a missed entry is choosing to acknowledge they completed the habit even if the app was not used at the time.

---

## 7. Timezone-change semantics

Entries store the `localDate` **resolved at the moment of recording** using the habit's then-current IANA timezone (`Habit.localDateFor(Instant)` is the canonical bucketing call).

**Changing the habit's timezone later does not retroactively re-bucket stored local dates.**

```
Example:
  Habit timezone: UTC → Habit records entry with localDate = 2026-02-01
  Habit timezone changed to: Asia/Kolkata (UTC+5:30)
  Same instant (2026-02-01T23:00:00Z) in Kolkata = 2026-02-02T04:30

  Stored entry localDate remains: 2026-02-01
  Calculator uses the stored localDate: 2026-02-01 is credited
  2026-02-02 has no entry: miss (if evaluated)
```

This means a timezone change shifts the "current local date" boundary for new completions but leaves the history intact. Callers that display "today's date" to the user should always recompute from the habit's current timezone.

---

## 8. Rounding and precision

### 8.1 Completion rate

```
completionRate = (double) metTargetPeriods / eligiblePeriods
```

Computed as Java double arithmetic:
- Exactly `0.0` when `eligiblePeriods == 0` (guard division by zero).
- In `[0.0, 1.0]` always.
- Not pre-rounded by the calculator; callers that need a fixed-decimal display should round at the presentation boundary (e.g. `Math.round(rate * 10000) / 10000.0` for 4 decimal places, or `String.format("%.1f%%", rate * 100)` for percentage display).

### 8.2 No rounding in streak counts

`currentStreak`, `longestStreak`, `eligiblePeriods`, and `metTargetPeriods` are exact integer counts. No rounding, flooring, or ceiling applies.

---

## 9. Boundary cases

| Scenario | Result |
| --- | --- |
| Window is empty (`to < from`) | All counts = 0; rate = 0.0 |
| Entire window paused | `eligiblePeriods = 0`; all counts = 0; rate = 0.0 |
| Single period, met | `currentStreak = 1`, `longestStreak = 1`, `rate = 1.0` |
| Single period, not met | `currentStreak = 0`, `longestStreak = 0`, `rate = 0.0` |
| All periods met | `currentStreak = eligiblePeriods = longestStreak` |
| Last period paused, preceding period met | `currentStreak = 1` (last eligible period was met) |
| Last eligible period missed | `currentStreak = 0` |
| Open-ended pause covers window end | Dates from pause start to window end are excluded |

---

## 10. Relationship to the LOS-1209 statistics endpoint

The `GET /habits/{habitId}/stats` endpoint (LOS-1209) returns a plain window projection:

```
totalDays, daysWithEntry, daysMeetingTarget, totalCompletions, completionRate
```

That endpoint uses a day-level completion rate **without pause exclusion** from its denominator (it counts all calendar days in the window). It does not claim streak semantics.

`HabitStreakCalculator` is the authoritative source for pause-aware eligibility and streak values. Any future endpoint or screen that shows streak counts must delegate to this calculator.

---

## 11. Version governance

This document is versioned with the codebase. Changes to the calculation rules require:

1. Updating this document.
2. Updating `HabitStreakCalculator.java` and its Javadoc.
3. Adding or updating deterministic fixture tests in `HabitStreakCalculationsTests.java`.
4. Recording significant behavioral changes as an ADR.
