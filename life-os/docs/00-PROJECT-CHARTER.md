# LifeOS project charter

## Vision

LifeOS gives one person a calm, coherent place to decide what matters, plan when to do it, focus on it, and review progress. It connects projects, tasks, calendar blocks, goals, notes, habits, and reports without forcing the user to maintain the same information in several disconnected tools.

## First-release outcomes

The first production release must let a user:

- create an account, verify it, sign in, sign out, recover access, and manage profile/timezone preferences;
- see a useful “Today” dashboard immediately after login;
- create and manage projects, milestones, tasks, subtasks, labels, priorities, and due dates;
- plan a day and week with time blocks and detect scheduling conflicts;
- run a focus timer tied to a task or time block;
- plan sprints and weekly goals;
- create goals, notes, brain-dump items, and habits;
- review progress and export a basic report;
- search their own LifeOS data and receive in-app notifications;
- use the product from mobile, tablet, and desktop;
- trust that their data is isolated, backed up, and protected.

## Scope boundaries

Included in v1: single-user accounts, self-service signup, email/password auth, private data, responsive web application, in-app notifications, email for account verification/reset, CSV/PDF report export, VPS deployment, Cloudflare, backups, monitoring.

Deferred: teams/shared workspaces, billing, native mobile apps, third-party calendar sync, AI assistants, social login, offline-first conflict resolution, public project sharing, comments/mentions, file storage beyond small project attachments.

## Success measures

- A new user reaches the Today screen within two minutes of starting signup.
- The primary task flow—create project, add task, schedule block, start focus, complete task—works end to end.
- No critical/high security findings at launch.
- p75 LCP <= 2.5s and INP <= 200ms on the production route under representative load.
- Core workflows pass keyboard-only and screen-reader smoke tests.
- Backup restore is rehearsed before production launch.

