import { OnboardingScreen } from "@features/onboarding";

/**
 * OnboardingRoute (LOS-0603). Mounts LOS-0514's `OnboardingScreen` at
 * `/life-os/app/onboarding`. Protected (wrapped in `RequireAuth` by
 * `AppRouter`) but deliberately outside `AppShell`: `docs/wireframes/
 * 01-AUTH-ONBOARDING.md`'s onboarding layout is its own minimal "LifeOS ...
 * Sign out" header and step rail, not the full sidebar/top-bar shell.
 */
export function OnboardingRoute() {
  return <OnboardingScreen />;
}
