import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@components/layout";
import { RequireAuth, useLogout } from "@features/auth";
import { useAuthSession } from "@state/authSession";
import { useToast } from "@state/toastQueue";
import {
  CancelDeletionRoute,
  ComingSoonRoute,
  ForgotPasswordRoute,
  LoginRoute,
  NotFoundRoute,
  OnboardingRoute,
  ResetPasswordRoute,
  SettingsRoute,
  SignupRoute,
  UnavailableRoute,
  VerifyEmailRoute,
} from "@routes/index";

/**
 * ProtectedShell (LOS-0603).
 *
 * The element the `/life-os/app` parent route renders, nested inside
 * `RequireAuth`. Reads the session `RequireAuth` already guarantees is
 * non-null once its children render, and hands `AppShell` the identity
 * fields/callbacks it needs but deliberately does not source itself —
 * `AppShell` stays a props-driven layout component, the same shape
 * `Sidebar`/`TopBar` already are, rather than reaching into `@features/auth`
 * or `@state` on its own.
 */
function ProtectedShell() {
  const { user } = useAuthSession();
  const logout = useLogout();
  const toast = useToast();

  if (user === null) {
    // Unreachable in practice — RequireAuth renders nothing while
    // `user` is null — kept only so TypeScript does not need a
    // non-null assertion below.
    return null;
  }

  return (
    <AppShell
      displayName={user.displayName}
      email={user.email}
      timeZone={user.timeZone}
      locale={user.locale}
      onQuickAddTriggerClick={() =>
        toast.push({ tone: "info", message: "Quick Add isn't available yet." })
      }
      onSignOut={() => logout.mutate()}
    />
  );
}

/**
 * AppRoutes (LOS-0603).
 *
 * The complete canonical route table from `23-NAVIGATION-AND-ROUTES.md`.
 * Every route not yet backed by a real screen (every primary `/app/*`
 * destination other than Settings — the rest are later Epic-06-onward
 * tickets' job) renders the shared `ComingSoonRoute` placeholder so the
 * full map is real and navigable today rather than a subset. Exported
 * separately from `AppRouter` (which adds the actual `BrowserRouter`) so
 * tests can drive it inside a `MemoryRouter` at an arbitrary starting path.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/life-os">
        <Route index element={<ComingSoonRoute />} />
        <Route path="signup" element={<SignupRoute />} />
        <Route path="login" element={<LoginRoute />} />
        <Route path="verify-email" element={<VerifyEmailRoute />} />
        <Route path="forgot-password" element={<ForgotPasswordRoute />} />
        <Route path="reset-password" element={<ResetPasswordRoute />} />
        <Route path="cancel-deletion" element={<CancelDeletionRoute />} />
        <Route path="privacy" element={<ComingSoonRoute />} />
        <Route path="terms" element={<ComingSoonRoute />} />
        <Route path="unavailable" element={<UnavailableRoute />} />

        <Route
          path="app/onboarding"
          element={
            <RequireAuth>
              <OnboardingRoute />
            </RequireAuth>
          }
        />

        <Route
          path="app"
          element={
            <RequireAuth>
              <ProtectedShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="today" replace />} />
          <Route path="today" element={<ComingSoonRoute />} />
          <Route path="tasks" element={<ComingSoonRoute />} />
          <Route path="tasks/:taskId" element={<ComingSoonRoute />} />
          <Route path="time-blocks" element={<ComingSoonRoute />} />
          <Route path="calendar" element={<ComingSoonRoute />} />
          <Route path="focus" element={<ComingSoonRoute />} />
          <Route path="projects" element={<ComingSoonRoute />} />
          <Route path="projects/:projectId" element={<ComingSoonRoute />} />
          <Route path="sprints" element={<ComingSoonRoute />} />
          <Route path="sprints/:sprintId" element={<ComingSoonRoute />} />
          <Route path="week-planner" element={<ComingSoonRoute />} />
          <Route path="goals" element={<ComingSoonRoute />} />
          <Route path="goals/:goalId" element={<ComingSoonRoute />} />
          <Route path="notes" element={<ComingSoonRoute />} />
          <Route path="notes/:noteId" element={<ComingSoonRoute />} />
          <Route path="brain-dump" element={<ComingSoonRoute />} />
          <Route path="habits" element={<ComingSoonRoute />} />
          <Route path="habits/:habitId" element={<ComingSoonRoute />} />
          <Route path="progress" element={<ComingSoonRoute />} />
          <Route path="reports" element={<ComingSoonRoute />} />
          <Route path="reviews" element={<ComingSoonRoute />} />
          <Route path="reviews/daily/:date" element={<ComingSoonRoute />} />
          <Route path="reviews/weekly/:weekStart" element={<ComingSoonRoute />} />
          <Route path="reviews/monthly/:month" element={<ComingSoonRoute />} />
          <Route path="search" element={<ComingSoonRoute />} />
          <Route path="notifications" element={<ComingSoonRoute />} />
          <Route path="settings/:section?" element={<SettingsRoute />} />
          <Route path="*" element={<NotFoundRoute variant="private" />} />
        </Route>

        <Route path="*" element={<NotFoundRoute variant="public" />} />
      </Route>
      <Route path="*" element={<Navigate to="/life-os" replace />} />
    </Routes>
  );
}

/** AppRouter (LOS-0603). What `App.tsx` actually mounts. */
export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
