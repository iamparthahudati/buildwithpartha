import { Check } from "lucide-react";

import { Icon, ProgressBar, Text } from "@components/ui";

import { ONBOARDING_STEPS, type OnboardingStepNumber } from "../model/onboardingSteps";

export interface OnboardingProgressRailProps {
  readonly currentStep: OnboardingStepNumber;
  readonly completedSteps: ReadonlySet<OnboardingStepNumber>;
}

export function OnboardingProgressRail({
  currentStep,
  completedSteps,
}: OnboardingProgressRailProps) {
  const percentComplete = ((currentStep - 1) / (ONBOARDING_STEPS.length - 1)) * 100;

  return (
    <nav className="lifeos-onboarding-progress" aria-label="Onboarding progress">
      <div className="lifeos-onboarding-progress__mobile">
        <div className="lifeos-onboarding-progress__mobile-header">
          <Text size="xs" tone="secondary">
            Step {currentStep} of {ONBOARDING_STEPS.length}
          </Text>
          <Text size="xs" weight="medium">
            {ONBOARDING_STEPS[currentStep - 1]?.label}
          </Text>
        </div>
        <ProgressBar value={percentComplete} max={100} label="Onboarding completion" />
      </div>

      <ol className="lifeos-onboarding-progress__rail">
        {ONBOARDING_STEPS.map((step) => {
          const isCurrent = step.number === currentStep;
          const isCompleted = completedSteps.has(step.number);
          const isPast = step.number < currentStep;

          return (
            <li
              key={step.number}
              className={[
                "lifeos-onboarding-progress__item",
                isCurrent && "lifeos-onboarding-progress__item--current",
                (isCompleted || isPast) && "lifeos-onboarding-progress__item--completed",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="lifeos-onboarding-progress__badge" aria-hidden="true">
                {isCompleted || isPast ? (
                  <Icon icon={Check} size="sm" decorative />
                ) : (
                  <span>{step.number}</span>
                )}
              </span>
              <span className="lifeos-onboarding-progress__label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
