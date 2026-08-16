# Permanent product context

Read this before every LifeOS ticket. This is the short, stable answer to “what are we building?”

## Product

**LifeOS** is a private personal productivity web application. It is not a public marketing dashboard and not a copy of the “One System” examples. The examples inform information density, navigation, card composition, tables, drawers, scheduling rows, focus timer placement, and status treatment.

## Users and access

- v1 supports independent user accounts; each account sees only its own records.
- Anonymous visitors may access only `/life-os`, auth pages, legal pages, and health/error resources.
- Successful login lands at `/life-os/app/today`.
- The user's timezone and week-start preference affect all planning views.

## Core navigation

Primary: Today, Projects, Tasks, Calendar, Time Blocks, Sprints, Week Planner, Progress, Goals, Notes, Brain Dump, Habits, Reports.

Global utilities: search, quick add, notifications, focus timer, profile/settings, sign out.

On small screens the left navigation becomes an accessible drawer. The main task remains reachable without horizontal scrolling.

## Visual direction from the references

- Quiet white/off-white canvas with thin cool-gray borders and subtle shadows.
- Cobalt/royal blue is the primary action and selection color.
- Navy/slate text; green success; amber warning; red danger/overdue; purple secondary status.
- 8px spacing rhythm; compact but not cramped cards; 8–12px corner radius.
- Page title and short helper sentence precede content.
- Summary metrics come before dense tables/lists.
- Dense records use a table on wide screens and stacked cards on small screens.
- Detail inspection uses a drawer or split panel on wide screens and a full-screen sheet on mobile.
- Charts explain progress but never replace the underlying number or accessible text summary.

## Product language

Use short action-first labels: “Add task”, “Start focus”, “Plan week”, “Mark done”. Avoid hype, gamified guilt, and fake urgency. Empty states explain the benefit and provide one primary next action. Dates must be unambiguous and localized from the user's timezone.

## Data rules

- Every domain record belongs to exactly one user in v1.
- Soft delete user content where recovery is valuable; hard-delete expired security tokens and revoked sessions.
- Store timestamps in UTC and the user's timezone as an IANA identifier, e.g. `Asia/Kolkata`.
- Progress derived from tasks is calculated consistently by the backend; the UI must not invent conflicting values.
- Audit security-sensitive actions and destructive content operations.

## Route contract

Public UI:

- `/life-os`
- `/life-os/login`
- `/life-os/signup`
- `/life-os/verify-email`
- `/life-os/forgot-password`
- `/life-os/reset-password`
- `/life-os/privacy`
- `/life-os/terms`

Protected UI begins at `/life-os/app/*`. API begins at `/life-os/api/v1/*`.

## Delivery rule

Do not implement a full screen until its token, atom, molecule, organism, mock-state, and accessibility tickets are complete. Do not integrate a screen with an API until both UI composition and API contract tests exist.

