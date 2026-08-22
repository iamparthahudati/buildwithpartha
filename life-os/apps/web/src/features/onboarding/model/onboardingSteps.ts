export type OnboardingStepNumber = 1 | 2 | 3 | 4;

export interface StepItem {
  readonly number: OnboardingStepNumber;
  readonly key: "WELCOME" | "TIME_AND_WEEK" | "PLANNING_DEFAULTS" | "START";
  readonly label: string;
}

export const ONBOARDING_STEPS: readonly StepItem[] = Object.freeze([
  { number: 1, key: "WELCOME", label: "Welcome" },
  { number: 2, key: "TIME_AND_WEEK", label: "Time and week" },
  { number: 3, key: "PLANNING_DEFAULTS", label: "Planning defaults" },
  { number: 4, key: "START", label: "Start LifeOS" },
]);
