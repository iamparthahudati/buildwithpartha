# Application shell and Today wireframes

## Large application shell

```text
┌──────────────┬─────────────────────────────────────────────────────────────┐
│ LifeOS       │ [date] [C Search] [C Quick Add] [Notif] [Focus] [Account] │
│              ├─────────────────────────────────────────────────────────────┤
│ EXECUTE      │ [offline/security/partial banner when applicable]          │
│ Today        │                                                             │
│ Tasks        │ <main: route content; focus target on navigation>          │
│ Time Blocks  │                                                             │
│              │                                                             │
│ PLAN         │                                                             │
│ Projects     │                                                             │
│ Sprints      │                                                             │
│ Week Planner │                                                             │
│ Calendar     │                                                             │
│ Goals        │                                                             │
│              │                                                             │
│ CAPTURE      │                                                             │
│ Notes        │                                                             │
│ Brain Dump   │                                                             │
│ Habits       │                                                             │
│              │                                                             │
│ REFLECT      │                                                             │
│ Progress     │                                                             │
│ Reports      │                                                             │
│ Reviews      │                                                             │
│              │                                                             │
│ [Focus mini] │                                                             │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

Sidebar collapse keeps labelled tooltips and keyboard order. Focus mini-player appears only for an active session or when intentionally expanded.

## Small application shell

```text
┌──────────────────────────────────┐
│ [Menu] Today       [Search][Add] │
│ [offline/active focus banner]    │
├──────────────────────────────────┤
│ <main single-column route>       │
└──────────────────────────────────┘

MENU DRAWER
┌──────────────────────────────────┐
│ LifeOS                       [x] │
│ grouped destinations             │
│ -------------------------------- │
│ Notifications · Settings         │
│ Active focus / Start focus       │
│ Account · Sign out               │
└──────────────────────────────────┘
```

Drawer traps focus and restores it to Menu. Primary route remains visible under a modal backdrop but is inert.

## Today — normal large

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ Good morning, {name}                              (*) Quick Add           │
│ Thursday, 16 August · Asia/Kolkata                                       │
├───────────┬───────────┬───────────┬───────────┬───────────┬───────────────┤
│ MIT state │ tasks     │ scheduled │ focus     │ projects  │ week          │
│ [C MetricCards; max 6, exact labels/denominators]                         │
├────────────────────────────────────────────┬──────────────────────────────┤
│ [F TodayPlan]                              │ [F ImmediateContext]         │
│ MIT card: complete/open/start/change       │ active focus/current block   │
│ Today's tasks (limited)                    │ next-up deterministic        │
│ Add task · View all                        │ overdue/replan compact        │
├────────────────────────────────────────────┼──────────────────────────────┤
│ [F TodaySchedule]                          │ [F SprintWeekSummary]        │
│ chronological blocks/current/conflict      │ sprint + capacity/outcomes   │
│ Add block · View calendar                  │ Open planner                 │
├───────────────────────────────┬────────────┴──────────────────────────────┤
│ [F ActiveProjects limited]    │ [F ReviewPrompt] [F BrainCapture] Habits │
└───────────────────────────────┴───────────────────────────────────────────┘
```

## Today — small

```text
┌──────────────────────────────┐
│ Good morning, {name}         │
│ Thu 16 Aug · Quick Add       │
├──────────────────────────────┤
│ [active focus/current block] │
├──────────────────────────────┤
│ TODAY'S FOCUS                │
│ [MIT / choose focus]         │
├──────────────────────────────┤
│ TODAY'S TASKS                │
│ [TaskCard] x limited         │
├──────────────────────────────┤
│ SCHEDULE                     │
│ [TimeBlockRow] chronological │
├──────────────────────────────┤
│ [overdue/replan compact]     │
│ [daily review]               │
│ [week/sprint]                │
│ [projects]                   │
│ [capture + habits]           │
└──────────────────────────────┘
```

## Today — first use

```text
┌──────────────────────────────────────────────┐
│ Today                                        │
│ Start with what needs your attention.        │
├──────────────────────────────────────────────┤
│ Choose today's focus                         │
│ (*) Add a task                               │
├──────────────────────────────────────────────┤
│ Then, when useful:                           │
│ Reserve a time block · Capture a thought     │
│ Projects / weekly planning explained quietly │
└──────────────────────────────────────────────┘
```

No zero-percent charts, empty fake schedule or celebratory/punitive state.

## Today — partial/offline

Successful widgets remain. A failed widget replaces only its body with `[C ErrorState compact] Retry · Open source`. Offline banner shows last updated; safe draft/queue language follows the state matrix. Skeletons preserve the same hierarchy and do not appear as interactive controls.
