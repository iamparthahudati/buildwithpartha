# 49 — Timezone and Recurrence Matrix

**Ticket**: LOS-1505  
**Status**: Done  
**Date**: 2026-09-11

## Purpose

This document records the design decisions, timezone class taxonomy, DST reference calendar, boundary event taxonomy, and acceptance test matrix for LifeOS timezone and recurrence validation. It is the authoritative specification for how LifeOS handles dates across timezone classes and calendar boundaries.

---

## 1. Core Design Invariant

> **UTC in storage and APIs; convert to the user's IANA timezone only at display/input boundaries.**
> — AGENTS.md §Non-negotiable quality rules

All timestamps stored in the database are `TIMESTAMP WITH TIME ZONE` in UTC. All API responses return UTC `Instant` strings (ISO 8601 `Z`-suffix). `LocalDate` values used by the recurrence engine are always resolved from the user's IANA timezone **at the API boundary** (request receive time or explicit user input). Once resolved, `LocalDate` values are used for all pure date arithmetic — no secondary UTC conversion occurs inside domain logic.

---

## 2. Timezone Class Taxonomy

| Class | Representative Zones | DST | UTC Offset Pattern |
|---|---|---|---|
| **DST-observing** | `America/New_York`, `Europe/London`, `America/Chicago`, `America/Los_Angeles`, `Europe/Berlin`, `Australia/Sydney` | Yes | Changes ±1h twice per year |
| **DST-free integer** | `Asia/Tashkent`, `Africa/Nairobi`, `Asia/Tokyo`, `America/Phoenix` | No | Fixed integer offset |
| **DST-free half-hour** | `Asia/Kolkata` (+05:30), `Asia/Kabul` (+04:30), `Asia/Kathmandu` (+05:45), `Australia/Adelaide` (+09:30/+10:30 with DST) | Mostly No | Fixed half-hour offset |
| **UTC baseline** | `UTC`, `Etc/UTC`, `Etc/GMT` | No | ±00:00 |
| **Extreme positive** | `Pacific/Auckland` (+12:00/+13:00), `Pacific/Chatham` (+12:45/+13:45) | Yes | 13+ hours ahead of UTC |
| **Extreme negative** | `Pacific/Midway` (−11:00), `Etc/GMT+12` (−12:00) | No | 12 hours behind UTC |

---

## 3. DST Reference Calendar (2026)

These are the canonical spring-forward and fall-back dates used in all LOS-1505 test scenarios.

| Zone | Spring-Forward (→ DST) | Fall-Back (← Standard) |
|---|---|---|
| `America/New_York` (ET) | 2026-03-08 02:00 → 03:00 (2nd Sunday in March) | 2026-11-01 02:00 → 01:00 (1st Sunday in November) |
| `America/Chicago` (CT) | 2026-03-08 | 2026-11-01 |
| `America/Los_Angeles` (PT) | 2026-03-08 | 2026-11-01 |
| `Europe/London` (GMT/BST) | 2026-03-29 01:00 → 02:00 (last Sunday in March) | 2026-10-25 02:00 → 01:00 (last Sunday in October) |
| `Europe/Berlin` (CET/CEST) | 2026-03-29 | 2026-10-25 |
| `Australia/Sydney` (AEST/AEDT) | 2026-10-04 (1st Sunday in October) | 2026-04-05 (1st Sunday in April) |
| `Pacific/Auckland` (NZST/NZDT) | 2026-09-27 (last Sunday in September) | 2026-04-05 (1st Sunday in April) |

> **Note**: `Asia/Kolkata`, `Asia/Tokyo`, `America/Phoenix`, `UTC` do not observe DST.

---

## 4. Calendar Boundary Taxonomy

| Boundary Type | Description | Representative Test Date |
|---|---|---|
| **Midnight** | Instant occurring at local midnight may be attributed to previous or next calendar day depending on UTC offset | `2026-02-01T03:00:00Z` → `2026-01-31` in `America/New_York` (UTC−5) |
| **DST spring-forward** | One wall-clock hour is skipped; the calendar day still exists in full | 2026-03-08 for `America/New_York` |
| **DST fall-back** | One wall-clock hour is repeated (25-hour day); calendar day exists once | 2026-11-01 for `America/New_York` |
| **Month-end** | Short months (Feb, Apr, Jun, Sep, Nov) clamp high anchor days | Day 31 → Feb 28/29, Apr 30 |
| **Leap year Feb 29** | Feb 29 exists in 2024, 2028; not in 2025, 2026, 2027 | `LocalDate.of(2024, 2, 29)` |
| **Year boundary** | Dec 31 → Jan 1; ISO week numbering spans two calendar years | 2026-12-31 → 2027-01-01 |
| **ISO week/year boundary** | ISO week 53 of one year overlaps with ISO week 1 of the next | 2025-12-29 (Monday, ISO-week 1 of 2026) |
| **Half-hour midnight** | At UTC+05:30, midnight local = 18:30 UTC previous day | 2026-04-01T00:00 IST = 2026-03-31T18:30Z |

---

## 5. Recurrence Frequency Reference

| Frequency | Engine Behaviour | Boundary Sensitivity |
|---|---|---|
| `DAILY` | +1 calendar day per step | DST spring-forward/fall-back: must include the gap/repeat day exactly once |
| `WEEKDAY` | Skip Saturday/Sunday | Week boundary, DST |
| `WEEKLY` | +interval weeks from week-start | ISO week/year boundary |
| `INTERVAL` | +intervalValue calendar days | Year boundary |
| `MONTHLY` | Anchor to `dayOfMonth`; clamp to last day of month | Month-end, leap-year Feb 29 |
| `AFTER_COMPLETION` | Single initial occurrence; next generated on task completion | No boundary sensitivity in generation |
| `YEARLY` | _(not yet implemented — see §7 Known Limitations)_ | Leap-year Feb 29 |

---

## 6. Acceptance Matrix

### 6.1 Backend Domain Tests (`TimezoneRecurrenceMatrixIntegrationTests.java`)

| ID | Scenario | Section | Status |
|---|---|---|---|
| TZ-B-1.1 | Daily series spans `America/New_York` spring-forward 2026-03-08 | 1 | ✅ Pass |
| TZ-B-1.2 | Daily series `America/New_York` fall-back 2026-11-01: no duplicate | 1 | ✅ Pass |
| TZ-B-1.3 | Daily series `Asia/Kolkata` (half-hour zone) across UK spring-forward dates | 1 | ✅ Pass |
| TZ-B-1.4 | UTC baseline daily series produces consecutive calendar days | 1 | ✅ Pass |
| TZ-B-1.5 | Daily series spans `Europe/London` spring-forward 2026-03-29 | 1 | ✅ Pass |
| TZ-B-2.1 | Daily series crosses Dec 31 → Jan 1 year boundary | 2 | ✅ Pass |
| TZ-B-2.2 | Weekly MONDAY series crosses ISO week/year boundary (Dec 28 → Jan 11) | 2 | ✅ Pass |
| TZ-B-2.3 | Weekly MONDAY+FRIDAY: first Friday falls in next year (Jan 1, 2027) | 2 | ✅ Pass |
| TZ-B-3.1 | Monthly day-31: Feb 2024 (leap) clamps to 29, Apr clamps to 30 | 3 | ✅ Pass |
| TZ-B-3.2 | Monthly day-29: Feb 2025 (non-leap) clamps to 28 | 3 | ✅ Pass |
| TZ-B-3.3 | Monthly day-31 UNTIL_DATE: last occurrence on Mar 31 is included | 3 | ✅ Pass |
| TZ-B-3.4 | Monthly day-29 starting Feb 29, 2024 (leap); next Feb clamps to 28 | 3 | ✅ Pass |
| TZ-B-4.1 | Weekly MONDAY from Dec 29, 2025 to Jan 12, 2026 spans ISO week/year join | 4 | ✅ Pass |
| TZ-B-4.2 | Bi-weekly WEDNESDAY from Dec 24, 2025 skips one week across year boundary | 4 | ✅ Pass |
| TZ-B-4.3 | YEARLY frequency gap documented as known limitation (test disabled) | 4 | ⚠️ Disabled |
| TZ-B-5.1 | Timezone annotation change does not alter `LocalDate` occurrence sequence | 5 | ✅ Pass |
| TZ-B-5.2 | Half-hour vs integer-offset timezone annotations produce same dates | 5 | ✅ Pass |
| TZ-B-6.1 | Daily habit streak is unbroken across `America/New_York` spring-forward | 6 | ✅ Pass |
| TZ-B-6.2 | Daily habit streak not inflated by fall-back extra hour | 6 | ✅ Pass |
| TZ-B-6.3 | Daily habit streak stable in `Asia/Kolkata` across month boundary | 6 | ✅ Pass |
| TZ-B-6.4 | Pause spanning DST spring-forward excludes day without breaking streak | 6 | ✅ Pass |

### 6.2 Backend Extended Engine Tests (`RecurrenceOccurrenceEngineTests.java` — LOS-1505 additions)

| ID | Scenario | Status |
|---|---|---|
| TZ-E-1 | Monthly day-28 across Feb 2024 (leap) and Feb 2025 (non-leap) | ✅ Pass |
| TZ-E-2 | Monthly day-31 UNTIL_DATE ending exactly on Mar 31 includes last occurrence | ✅ Pass |

### 6.3 Frontend E2E Tests (`timezone-recurrence-matrix.spec.ts`)

| ID | Scenario | Section | Status |
|---|---|---|---|
| TZ-F-1.1 | Today dashboard renders in `America/New_York` on spring-forward day | 1 | ✅ Pass |
| TZ-F-1.2 | Today dashboard renders in `America/New_York` on fall-back day | 1 | ✅ Pass |
| TZ-F-1.3 | Today dashboard renders in `Asia/Kolkata` on month boundary | 1 | ✅ Pass |
| TZ-F-1.4 | Today dashboard renders in `Pacific/Auckland` on year boundary | 1 | ✅ Pass |
| TZ-F-1.5 | Today dashboard renders in `UTC` on year-end | 1 | ✅ Pass |
| TZ-F-1.6 | Today dashboard renders in `Europe/London` on spring-forward day | 1 | ✅ Pass |
| TZ-F-2.1 | Task due 2026-03-08 renders in `America/New_York` without errors | 2 | ✅ Pass |
| TZ-F-2.2 | Task due 2026-11-01 (fall-back) renders in `America/New_York` without errors | 2 | ✅ Pass |
| TZ-F-3.1 | Recurring task badge on spring-forward date renders without errors | 3 | ✅ Pass |
| TZ-F-3.2 | Recurring task badge on year-boundary date in `Asia/Kolkata` renders | 3 | ✅ Pass |
| TZ-F-4.1 | Habit list renders without errors on `America/New_York` spring-forward | 4 | ✅ Pass |
| TZ-F-4.2 | Habit list renders without errors on `America/New_York` fall-back | 4 | ✅ Pass |
| TZ-F-5.1 | Today renders without errors on Dec 31 in `Asia/Kolkata` | 5 | ✅ Pass |
| TZ-F-5.2 | Today renders without errors on Jan 1 in `Pacific/Auckland` (UTC+13) | 5 | ✅ Pass |
| TZ-F-5.3 | Today renders without errors on Dec 31 in `Etc/GMT+12` (UTC−12) | 5 | ✅ Pass |
| TZ-F-6.1 | No layout regression on `America/New_York` spring-forward | 6 | ✅ Pass |
| TZ-F-6.2 | No layout regression on `America/New_York` fall-back | 6 | ✅ Pass |
| TZ-F-6.3 | No layout regression on `Europe/London` spring-forward | 6 | ✅ Pass |
| TZ-F-6.4 | No layout regression on `Asia/Kolkata` month-end | 6 | ✅ Pass |

---

## 7. Known Limitations and Accepted Gaps

| ID | Limitation | Accepted? | Follow-up |
|---|---|---|---|
| TZ-GAP-1 | **YEARLY frequency not implemented** in `RecurrenceOccurrenceEngine`. No YEARLY series can be created; the UI recurrence editor does not offer YEARLY cadence. | Yes — deferred | Future ticket when YEARLY is added to the product scope |
| TZ-GAP-2 | **Half-hour sub-offset display rounding**: Times near midnight in `Asia/Kathmandu` (UTC+05:45) may display with a one-minute rounding artefact in some browser locale formatters. | Yes — cosmetic only | Accepted as cosmetic; no data integrity impact |
| TZ-GAP-3 | **Legacy timezone identifiers**: Zones specified as `Etc/GMT+12` follow POSIX sign-reversal convention (positive offset = west). The backend accepts and stores these as valid IANA zones; existing entries are unaffected. | Yes — documented | Mention in user-facing timezone selector as a UX note |
| TZ-GAP-4 | **Timezone change retroactivity**: If a user changes their profile timezone, past habit entries retain their originally-recorded `LocalDate`. The streak calculation uses stored `LocalDate` values and does not retroactively re-bucket entries. This matches the contract defined in `HabitStreakCalculationsTests.timezoneChangeDoesNotRebucketStoredEntries`. | Yes — by design | Documented in privacy data lifecycle doc |
| TZ-GAP-5 | **iOS Safari virtual keyboard `position: fixed` shift** near midnight DST transitions (inherited from LOS-1504). No critical-path surfaces currently affected. | Yes — monitored | Carried forward from LOS-1504 |

---

## 8. Test Execution Commands

```bash
# Backend — all tests including timezone matrix suite
cd life-os/apps/api && ./gradlew check

# Frontend — type-check, lint, unit tests
cd life-os/apps/web && npm run verify:quality && npm run test:unit

# Frontend — E2E timezone matrix spec (preview server required)
cd life-os/apps/web && npx playwright test e2e/timezone-recurrence/timezone-recurrence-matrix.spec.ts --project=desktop-chromium

# Docs validation
node life-os/scripts/validate-docs.mjs

# Dependency lock validation
node life-os/scripts/validate-dependency-locks.mjs
```

---

## 9. References

- [34-HABIT-STREAK-CALCULATIONS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/34-HABIT-STREAK-CALCULATIONS.md) — Habit streak algorithm and cadence rules
- [48-BROWSER-SUPPORT-POLICY.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/48-BROWSER-SUPPORT-POLICY.md) — Browser support tier classification (LOS-1504)
- [31-PRIVACY-DATA-LIFECYCLE.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/31-PRIVACY-DATA-LIFECYCLE.md) — Retention, deletion, and timezone data handling
- [`RecurrenceOccurrenceEngine.java`](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/main/java/tech/buildwithpartha/lifeos/task/domain/RecurrenceOccurrenceEngine.java) — Domain occurrence date generator
- [`TimezoneRecurrenceMatrixIntegrationTests.java`](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/api/src/test/java/tech/buildwithpartha/lifeos/task/domain/TimezoneRecurrenceMatrixIntegrationTests.java) — Backend matrix test suite (LOS-1505)
- [`timezone-recurrence-matrix.spec.ts`](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/apps/web/e2e/timezone-recurrence/timezone-recurrence-matrix.spec.ts) — Frontend E2E matrix spec (LOS-1505)
