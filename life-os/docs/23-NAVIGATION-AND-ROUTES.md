# Navigation and route map

Frontend router base: `/life-os`. API prefix: `/life-os/api/v1`. Caddy must route API before the SPA fallback.

## Public routes

| Route | Purpose | Auth behavior |
| --- | --- | --- |
| `/life-os` | Minimal product/sign-in entry | Signed-in user may continue to `/app/today`; no private data. |
| `/life-os/signup` | Create account | Signed-in user redirects safely to Today. |
| `/life-os/login` | Sign in | Valid same-origin `returnTo` supported. |
| `/life-os/verify-email` | Sent/verify/result states | Token handled safely; no app data before verification. |
| `/life-os/forgot-password` | Request recovery | Generic account-enumeration-safe result. |
| `/life-os/reset-password` | Set password from token | Expired/used/error states; never expose token in logs. |
| `/life-os/privacy` | Privacy information | Always public. |
| `/life-os/terms` | Terms | Always public. |
| `/life-os/unavailable` | Maintenance/safe service state | Public, no private cached details. |

## Protected primary routes

| Route | Canonical screen |
| --- | --- |
| `/life-os/app/today` | Today dashboard |
| `/life-os/app/tasks` | Tasks list |
| `/life-os/app/tasks/:taskId` | Task details |
| `/life-os/app/time-blocks` | Time Blocks day/week |
| `/life-os/app/calendar` | Calendar |
| `/life-os/app/focus` | Full Focus Mode/current session |
| `/life-os/app/projects` | Projects list |
| `/life-os/app/projects/:projectId` | Project details |
| `/life-os/app/sprints` | Sprints |
| `/life-os/app/sprints/:sprintId` | Sprint details/review |
| `/life-os/app/week-planner` | Week Planner |
| `/life-os/app/goals` | Goals list |
| `/life-os/app/goals/:goalId` | Goal details/check-ins |
| `/life-os/app/notes` | Notes list/editor shell |
| `/life-os/app/notes/:noteId` | Canonical note |
| `/life-os/app/brain-dump` | Brain Dump inbox/triage |
| `/life-os/app/habits` | Habits today/list |
| `/life-os/app/habits/:habitId` | Habit details/history |
| `/life-os/app/progress` | Progress overview |
| `/life-os/app/reports` | Reports/exports |
| `/life-os/app/reviews` | Review history/start choices |
| `/life-os/app/reviews/daily/:date` | Morning/evening daily review |
| `/life-os/app/reviews/weekly/:weekStart` | Weekly review |
| `/life-os/app/reviews/monthly/:month` | Monthly review |
| `/life-os/app/search` | Full global search results |
| `/life-os/app/notifications` | Full notification history/preferences entry |
| `/life-os/app/settings/:section?` | Settings section |

The default `/life-os/app` redirects to `/life-os/app/today`. Unknown protected routes show a private Not Found page inside the shell. Unknown public routes show a public Not Found page without shell/private cache.

## URL state contracts

List/report/calendar routes use documented query parameters:

- `q` search text;
- `status`, `priority`, `label`, `project`, `health`, `category` filters as applicable;
- `sort` and `direction` with stable backend tie breaker;
- `page` and `size` for paginated lists;
- `view` for table/card or day/week/month where it has shareable meaning;
- `date`, `start`, `end` as canonical date-only values;
- `tab` for stable detail tabs when nested routes would add no benefit.

Unknown/invalid values are normalized to safe defaults and the UI explains discarded filters when that matters. Sensitive form text, auth tokens, note bodies and unsaved drafts never enter the URL.

## Desktop behavior

- Persistent/collapsible left rail grouped by Execute, Plan, Capture and grow, Reflect.
- Top utilities: date/context, Search, Quick Add, Notifications, active Focus, Account.
- Detail-capable lists may show a right panel, but browser URL changes to the canonical detail route or explicit selection state.
- Closing detail returns to the stored list location/filter/scroll and restores focus.

## Tablet behavior

- Collapsible rail defaults compact when space requires; user choice is device-local.
- Detail panel becomes a wide drawer or full route based on available width.
- Touch and keyboard alternatives exist for drag-dependent planning interactions.

## Mobile behavior

- Header menu opens a modal navigation drawer with current destination and global utilities.
- Core actions are reachable without page-level horizontal scrolling; dense tables render labelled record cards.
- Detail uses a full route/sheet; system/browser Back returns to prior list context.
- Bottom fixed actions respect safe area and never cover form errors/content.

## Authentication and return behavior

- Protected navigation checks the server session; client guards improve UX but are not authorization.
- On 401, preserve only safe local draft/context, clear private query caches and go to login with a validated same-origin relative `returnTo`.
- After login, navigate to valid `returnTo`; otherwise Today.
- Unverified users go only to verification/resend flow.
- Logout clears client private state then returns to login/public entry; Back cannot reveal protected cached content.

## Unsaved changes

- Dirty form/editor intercepts in-app navigation and route detail changes with Save/Discard/Stay.
- Browser unload warning is used only when actual unsaved work exists.
- Autosaved server-confirmed content is not considered dirty.
- Offline local/queued state is named explicitly; leaving cannot silently delete it.

## Accessibility

- A skip link moves to `main`; landmarks and one page-level heading remain consistent.
- Route changes move focus to the page heading or a deliberate focus target and announce the new title once.
- Drawer/dialog closes restore focus; active nav uses `aria-current="page"`.
- Keyboard shortcuts never fire while typing unless specifically scoped and are discoverable/remappable where necessary.

