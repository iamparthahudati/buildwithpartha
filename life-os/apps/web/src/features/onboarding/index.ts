export { OnboardingScreen, type OnboardingScreenProps } from "./components/OnboardingScreen";
export {
  OnboardingProgressRail,
  type OnboardingProgressRailProps,
} from "./components/OnboardingProgressRail";
export { WelcomeStep, type WelcomeStepProps } from "./components/WelcomeStep";
export { TimeAndWeekStep, type TimeAndWeekStepProps } from "./components/TimeAndWeekStep";
export {
  PlanningDefaultsStep,
  type PlanningDefaultsStepProps,
} from "./components/PlanningDefaultsStep";
export { StartStep, type StartStepProps } from "./components/StartStep";

export { useOnboarding, ONBOARDING_QUERY_KEY } from "./hooks/useOnboarding";
export { useUpdateWelcomeStep } from "./hooks/useUpdateWelcomeStep";
export { useUpdateTimeAndWeekStep } from "./hooks/useUpdateTimeAndWeekStep";
export { useUpdatePlanningDefaultsStep } from "./hooks/useUpdatePlanningDefaultsStep";
export { useCompleteOnboarding } from "./hooks/useCompleteOnboarding";

export {
  ONBOARDING_STEPS,
  type OnboardingStepNumber,
  type StepItem,
} from "./model/onboardingSteps";
export {
  detectBrowserTimezone,
  formatTimezonePreview,
  getAvailableTimezones,
  isValidTimezone,
  type TimezoneOption,
  type TimezonePreview,
} from "./model/timezones";
export {
  validateWelcomeForm,
  validateTimeAndWeekForm,
  validatePlanningDefaultsForm,
  type WelcomeFormValues,
  type WelcomeFormErrors,
  type TimeAndWeekFormValues,
  type TimeAndWeekFormErrors,
  type PlanningDefaultsFormValues,
  type PlanningDefaultsFormErrors,
} from "./model/onboardingValidation";
export {
  resolveWelcomeFieldErrors,
  resolveTimeAndWeekFieldErrors,
  resolvePlanningDefaultsFieldErrors,
} from "./model/onboardingFieldErrors";

export * from "./api/onboardingApi";
