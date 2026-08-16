# Component-to-screen map

This matrix prevents screen tickets from hiding new primitives. `A` = atoms (Epic 03), `C` = composed patterns (Epic 04), `F` = feature component in its module ticket.

| Screen | Required shared components before composition | Feature components built before screen |
| --- | --- | --- |
| Signup/Login/Recovery | A Button/Input/Password/Link/Alert; C FormField/ErrorState | AuthForm, PasswordRequirements, VerificationState |
| Today | A Badge/Progress/Surface; C PageHeader/MetricCard/ChartFrame/DataTable/TimerRing | TodayPlan, TodaySchedule, SprintWeekSummary, NextUp, ReviewPrompt |
| Projects | C PageHeader/MetricCard/FilterBar/DataTable/DetailPanel/FormDialog | ProjectRow/Card/Form/SummaryStrip |
| Project Details | C Tabs/Charts/Timeline/Activity/Attachment/Comment | ProjectHeader, ProgressSummary, TaskBreakdown, MilestoneList |
| Tasks | C PageHeader/MetricCard/FilterBar/DataTable/BulkAction/DetailPanel | TaskRow/Card/Form/SummaryPresets |
| Task Details | C Tabs/Drawer/Comment/Attachment/Activity | TaskHeader, SubtaskChecklist, DependencyEditor, SchedulingPanel |
| Time Blocks | C PageHeader/MetricCard/ChartFrame/FormDialog | TimeBlockRow/Form, DayTimeline, TimeSummary, UpcomingBlocks |
| Calendar | C PageHeader/FilterBar/Drawer | CalendarHeader, Day/Week/MonthGrid, EventChip, OverflowList |
| Focus Mode | A ProgressRing/Button; C TimerRing/Dialog/Toast | FocusControls, SessionContext, InterruptionCapture |
| Sprints | C PageHeader/MetricCard/DataTable/Timeline/FormDialog | SprintCard/Form, CommitmentList, Retrospective |
| Week Planner | C PageHeader/FilterBar/DataTable/Drawer | WeekStrip, Capacity, Outcomes, UnscheduledQueue |
| Goals | C PageHeader/MetricCard/Charts/FormDialog | GoalCard/Form, ProgressEditor, CheckInHistory |
| Notes | C Search/Filter/Drawer/Alert | NoteCard, NoteEditor, AutosaveStatus, LinkPicker |
| Brain Dump | C Quick form/DataTable/ConfirmDialog | Capture, InboxItem, BatchTriage, ConversionFlow |
| Habits | C PageHeader/MetricCard/Charts/FormDialog | HabitRow/Form, EntryControl, Streak, Heatmap |
| Progress/Reports | C MetricCard/FilterBar/Charts/DataTable/Empty/Error | ReportSelector, MetricExplanation, ExportStatus |
| Search | C SearchField/CommandPalette/Tabs/Empty/Error | GroupedResults, SearchResultRow, RecentSearches |
| Notifications | C Drawer/Menu/Empty/Error/Switch | NotificationRow/Group, PreferenceSection |
| Reviews | C Stepper/FormField/Charts/SaveStatus | DailyReview, WeeklyReview, MonthlyReview feature steps |
| Settings | C Tabs/FormField/FormDialog/DataTable/ConfirmDialog | Profile, Planning, Notifications, Appearance, Security, Data panels |

If a screen requires an unlisted reusable component, stop and create a dedicated component ticket with catalog/test/accessibility acceptance before continuing.

