# EPIC-04 — Composed components and application patterns

These tickets compose only completed atoms. Each supports applicable loading, empty, error, offline, responsive, keyboard, and test states before any screen consumes it.

| ID | Ticket | Description and acceptance contract | Depends on | Estimate | Status |
| --- | --- | --- | --- | --- | --- |
| LOS-0401 | Build FormField | Compose label, control, help, required and error summary linkage with unique IDs and server-error mapping. | LOS-0333 | S | Done |
| LOS-0402 | Build SearchField | Debounced/submit modes, clear, shortcut hint, loading, recent/no-result hook contract, IME-safe behavior. | LOS-0401 | S | Done |
| LOS-0403 | Build Combobox | Accessible single/multi select, async loading, create option, keyboard, virtualization threshold, empty/error. Use only where native Select is insufficient. | LOS-0401 | M | Done |
| LOS-0404 | Build DateRangeField | Start/end dates, presets, invalid order, timezone-safe date-only values, keyboard and mobile sheet behavior. | LOS-0401 | M | Done |
| LOS-0405 | Build DateTimeField | Compose local date/time/timezone, DST invalid/ambiguous warnings, clear/error/read-only. | LOS-0401 | M | Done |
| LOS-0406 | Build DurationField | Hours/minutes entry with normalization, bounds, readable summary and mobile input behavior. | LOS-0401 | S | Done |
| LOS-0407 | Build ColorIconPicker | Approved accessible palette/icon list, keyboard selection, named color output, contrast-safe preview. | LOS-0304, LOS-0401 | S | Done |
| LOS-0408 | Build Alert and InlineMessage | Info/success/warning/danger variants, heading/action/dismiss, role selection preventing duplicate announcements. | LOS-0309, LOS-0327 | S | Done |
| LOS-0409 | Build Toast system | Queued nonblocking success/error notifications, dedupe, pause, keyboard dismiss, reduced motion, persistent alternative for critical errors. | LOS-0408 | M | Done |
| LOS-0410 | Build EmptyState | First-use, filtered, search, permission and archived variants with illustration/icon optional, one primary and one secondary action. | LOS-0306, LOS-0329 | S | Done |
| LOS-0411 | Build ErrorState | Region/page variants for retry, go back, sign-in, correlation ID and preserved-work messaging. | LOS-0408 | S | Done |
| LOS-0412 | Build Dialog | Focus trap/restore, labelled title/description, Escape/overlay rules, nested-action protection, mobile sizing. | LOS-0306, LOS-0327 | M | Done |
| LOS-0413 | Build ConfirmDialog | Exact object/consequence, danger action, optional typed confirmation only for high-impact operations, pending/error/return-focus. | LOS-0412 | S | Done |
| LOS-0414 | Build Drawer and DetailPanel | Side/full-screen responsive variants, deep-link hook, focus management, dirty-state guard, stable close/back behavior. | LOS-0412 | M | Done |
| LOS-0415 | Build Menu and AccountMenu pattern | Keyboard navigation, typeahead, separators, destructive item treatment, collision and touch behavior. | LOS-0307, LOS-0326 | M | Done |
| LOS-0416 | Build Tabs | URL/local variants, arrow-key behavior, overflow on mobile, counts/badges and lazy panel loading without losing semantics. | LOS-0308, LOS-0309 | M | Done |
| LOS-0417 | Build Breadcrumbs and BackLink | Responsive truncation, current page semantics, browser-history-safe fallback. | LOS-0308 | S | Done |
| LOS-0418 | Build PageHeader | Title, helper copy, breadcrumbs, primary/split actions, metadata and responsive wrapping. | LOS-0305, LOS-0306, LOS-0417 | S | Done |
| LOS-0419 | Build MetricCard | Icon, label, value, period/helper, trend, action, loading/error/empty. Numbers and trend have accessible text. | LOS-0309, LOS-0329 | S | Done |
| LOS-0420 | Build FilterBar | Filter controls, active chips, result count, clear all, responsive drawer, URL serialization contract. | LOS-0403, LOS-0404, LOS-0414 | M | Done |
| LOS-0421 | Build Pagination | Page/size/total, compact mobile variant, disabled boundaries, URL integration and screen-reader labels. | LOS-0306 | S | Done |
| LOS-0422 | Build SortControl and ViewToggle | Stable sort labels/direction and list/grid/table preference with accessible pressed state. | LOS-0307, LOS-0415 | S | Done |
| LOS-0423 | Build Table primitives | Semantic table/head/body/row/cell, selection/actions, sticky header, density, truncation, keyboard rules and responsive escape hatch. | LOS-0311, LOS-0330 | M | Done |
| LOS-0424 | Build DataTable | Compose query state, filters/sort/pagination/selection/bulk actions/loading/empty/error with responsive card renderer. No domain columns hardcoded. | LOS-0410, LOS-0411, LOS-0420–LOS-0423 | L | Done |
| LOS-0425 | Build FormDialog pattern | Create/edit dialog with dirty guard, submit pending, field/server errors, success close/return focus, and mobile full-screen form. | LOS-0401, LOS-0412 | M | Done |
| LOS-0426 | Build CommandPalette | Keyboard-open search/action surface with grouped results, safe shortcuts, focus restore, no unauthorized cached result. | LOS-0402, LOS-0412 | M | Done |
| LOS-0427 | Build TimerRing | Duration/progress/state/actions layout, tabular numerals, pause/completed variants, reduced motion and non-spam announcements. | LOS-0322, LOS-0327 | S | Done |
| LOS-0428 | Build chart frame and legend | Title/summary/period/loading/empty/error/export slot, accessible legend and data-table fallback contract. | LOS-0411, LOS-0329 | S | Done |
| LOS-0429 | Build line/bar/donut chart wrappers | Token-based responsive charts, tooltip/keyboard/data table, zero/negative/large values, print behavior. | LOS-0428 | M | Done |
| LOS-0430 | Build timeline primitives | Dated milestones/activity states, current/completed/future/overdue semantics and mobile layout. | LOS-0309, LOS-0330 | S | Done |
| LOS-0431 | Build attachment uploader/list | Feature-flagged picker, restrictions, progress/cancel/retry, safe filename, scan state and authorized download/delete UI. | LOS-0408, LOS-0413 | M | Done |
| LOS-0432 | Build comment composer/list | Plain/Markdown-safe text, pending/edit/delete, timestamps, empty/error, keyboard submission without accidental send. | LOS-0401, LOS-0413 | M | Done |
| LOS-0433 | Build activity feed | Structured actor/action/object/time rendering, grouped pagination, safe fallback for deleted objects and accessible icons. | LOS-0430 | M | Done |
| LOS-0434 | Run composed component gate | Catalog and automated/manual tests cover all patterns at mobile/tablet/desktop; screen teams can compose without creating new hidden primitives. | LOS-0401–LOS-0433 | S | Done |

