/**
 * LifeOS Route Lazy Loaders (LOS-1510).
 *
 * Provides dynamic import factories for every screen route to enable
 * code-splitting and automated route bundle budget verification.
 */
export const ROUTE_LOADERS = Object.freeze({
  CancelDeletionRoute: () =>
    import("@routes/CancelDeletionRoute").then((m) => ({ default: m.CancelDeletionRoute })),
  CalendarRoute: () => import("@routes/CalendarRoute").then((m) => ({ default: m.CalendarRoute })),
  ComingSoonRoute: () =>
    import("@routes/ComingSoonRoute").then((m) => ({ default: m.ComingSoonRoute })),
  ForgotPasswordRoute: () =>
    import("@routes/ForgotPasswordRoute").then((m) => ({ default: m.ForgotPasswordRoute })),
  FocusRoute: () => import("@routes/FocusRoute").then((m) => ({ default: m.FocusRoute })),
  GoalsRoute: () => import("@routes/GoalsRoute").then((m) => ({ default: m.GoalsRoute })),
  GoalDetailsRoute: () =>
    import("@routes/GoalDetailsRoute").then((m) => ({ default: m.GoalDetailsRoute })),
  LoginRoute: () => import("@routes/LoginRoute").then((m) => ({ default: m.LoginRoute })),
  LandingRoute: () => import("@routes/LandingRoute").then((m) => ({ default: m.LandingRoute })),
  NotFoundRoute: () => import("@routes/NotFoundRoute").then((m) => ({ default: m.NotFoundRoute })),
  NotificationsRoute: () =>
    import("@routes/NotificationsRoute").then((m) => ({ default: m.NotificationsRoute })),
  OnboardingRoute: () =>
    import("@routes/OnboardingRoute").then((m) => ({ default: m.OnboardingRoute })),
  NotesRoute: () => import("@routes/NotesRoute").then((m) => ({ default: m.NotesRoute })),
  BrainDumpRoute: () =>
    import("@routes/BrainDumpRoute").then((m) => ({ default: m.BrainDumpRoute })),
  HabitsRoute: () => import("@routes/HabitsRoute").then((m) => ({ default: m.HabitsRoute })),
  PrivacyRoute: () => import("@routes/PrivacyRoute").then((m) => ({ default: m.PrivacyRoute })),
  ProgressRoute: () => import("@routes/ProgressRoute").then((m) => ({ default: m.ProgressRoute })),
  ProjectsRoute: () => import("@routes/ProjectsRoute").then((m) => ({ default: m.ProjectsRoute })),
  ProjectDetailsRoute: () =>
    import("@routes/ProjectDetailsRoute").then((m) => ({ default: m.ProjectDetailsRoute })),
  ReportsRoute: () => import("@routes/ReportsRoute").then((m) => ({ default: m.ReportsRoute })),
  ResetPasswordRoute: () =>
    import("@routes/ResetPasswordRoute").then((m) => ({ default: m.ResetPasswordRoute })),
  SearchRoute: () => import("@routes/SearchRoute").then((m) => ({ default: m.SearchRoute })),
  SettingsRoute: () => import("@routes/SettingsRoute").then((m) => ({ default: m.SettingsRoute })),
  SprintsRoute: () => import("@routes/SprintsRoute").then((m) => ({ default: m.SprintsRoute })),
  SignupRoute: () => import("@routes/SignupRoute").then((m) => ({ default: m.SignupRoute })),
  TermsRoute: () => import("@routes/TermsRoute").then((m) => ({ default: m.TermsRoute })),
  TodayRoute: () => import("@routes/TodayRoute").then((m) => ({ default: m.TodayRoute })),
  TasksRoute: () => import("@routes/TasksRoute").then((m) => ({ default: m.TasksRoute })),
  TaskDetailsRoute: () =>
    import("@routes/TaskDetailsRoute").then((m) => ({ default: m.TaskDetailsRoute })),
  TimeBlocksRoute: () =>
    import("@routes/TimeBlocksRoute").then((m) => ({ default: m.TimeBlocksRoute })),
  UnavailableRoute: () =>
    import("@routes/UnavailableRoute").then((m) => ({ default: m.UnavailableRoute })),
  VerifyEmailRoute: () =>
    import("@routes/VerifyEmailRoute").then((m) => ({ default: m.VerifyEmailRoute })),
  WeekPlannerRoute: () =>
    import("@routes/WeekPlannerRoute").then((m) => ({ default: m.WeekPlannerRoute })),
});
