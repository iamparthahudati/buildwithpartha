# EPIC-01 — Product and UX specification

| ID | Ticket | Description and acceptance contract | Depends on |
| --- | --- | --- | --- |
| LOS-0101 | Validate personas and top jobs | Interview/reflect on real routines and rank jobs-to-be-done. Personas include needs, triggers, barriers, accessibility, and measurable success; unsupported assumptions are marked. | LOS-0001 |
| LOS-0102 | Freeze v1 scope and future boundary | Classify every specification capability as launch, optional gate, or future. Resolve attachments/offline depth/email/report export scope; roadmap and backlog agree. | LOS-0101 |
| LOS-0103 | Approve information architecture | Validate Execute/Plan/Capture/Reflect groups, entity relationships, naming, and destination hierarchy. Card sort or owner walkthrough finds no duplicate concepts such as labels vs tags. | LOS-0101 |
| LOS-0104 | Approve navigation and route map | Define public/protected URLs, desktop/tablet/mobile navigation, deep-link behavior, back behavior, and unsaved-change rules. Routes remain under `/life-os`. | LOS-0103 |
| LOS-0105 | Map critical user journeys | Diagram signup, first-day setup, project→task→schedule→focus→complete, review cycles, recurrence, recovery/export/delete. Each journey includes failures and recovery. | LOS-0102, LOS-0104 |
| LOS-0106 | Define onboarding | Specify minimum setup: display name, timezone, week start, work hours, focus defaults, optional starter records. User may skip nonessential steps and reaches an honest Today screen. | LOS-0105 |
| LOS-0107 | Specify dashboard information priority | Rank Today widgets and responsive collapse order; define source, action, freshness, and empty/error state per widget. No contradictory progress metric is allowed. | LOS-0105 |
| LOS-0108 | Specify review rituals | Finalize morning/evening daily, weekly, monthly prompts, snapshots, skip/resume rules, and expected duration. Copy remains non-judgmental. | LOS-0101, LOS-0105 |
| LOS-0109 | Create low-fidelity wireframes | Produce responsive wireframes for all auth and protected screens, drawers, modals, tables/cards, offline/conflict states. Every screen maps to components and routes. | LOS-0104, LOS-0107, LOS-0108 |
| LOS-0110 | Prototype critical interactions | Test navigation, Quick Add, task details, time-block drag/resize, focus recovery, weekly planning, and mobile drawer at low fidelity. Record changes and unresolved risks. | LOS-0109 |
| LOS-0111 | Finalize product vocabulary | Create glossary for project/task/block/sprint/goal/review/status/priority/label and action verbs. UI, API, DB, docs use the same concepts. | LOS-0103 |
| LOS-0112 | Define content and tone guide | Specify headings, instructions, validation, empty/error/destructive/review language and localization rules. Include approved examples without reference-product copy. | LOS-0111 |
| LOS-0113 | Complete privacy/data lifecycle discovery | Map data collected, purpose, retention, export, deletion, logs, backups, email, optional files/AI. Identify consent and policy requirements before implementation. | LOS-0102 |
| LOS-0114 | Run product/UX phase gate | Owner signs off scope, IA, journeys, wireframes, states, content, and privacy map. All material unknowns become named tickets/ADRs. | LOS-0101–LOS-0113 |

