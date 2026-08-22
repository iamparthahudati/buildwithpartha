import { useEffect, useMemo, useRef, useState } from "react";

import { Alert, ErrorState } from "@components/feedback";
import { Button, Logo, Skeleton, Spinner, Text } from "@components/ui";
import { useLogout } from "@features/auth";
import { useAuthSession } from "@state/authSession";

import type { OnboardingResponse, UpdatePlanningDefaultsStepRequest } from "../api/onboardingApi";
import { useCompleteOnboarding } from "../hooks/useCompleteOnboarding";
import { useOnboarding } from "../hooks/useOnboarding";
import { useUpdatePlanningDefaultsStep } from "../hooks/useUpdatePlanningDefaultsStep";
import { useUpdateTimeAndWeekStep } from "../hooks/useUpdateTimeAndWeekStep";
import { useUpdateWelcomeStep } from "../hooks/useUpdateWelcomeStep";
import type { OnboardingStepNumber } from "../model/onboardingSteps";
import type {
  PlanningDefaultsFormValues,
  TimeAndWeekFormValues,
  WelcomeFormValues,
} from "../model/onboardingValidation";
import { OnboardingProgressRail } from "./OnboardingProgressRail";
import { PlanningDefaultsStep } from "./PlanningDefaultsStep";
import { StartStep } from "./StartStep";
import { TimeAndWeekStep } from "./TimeAndWeekStep";
import { WelcomeStep } from "./WelcomeStep";
import "./onboarding-screen.css";

const TODAY_PATH = "/life-os/app/today";

export interface OnboardingScreenProps {
  /** Overridable for tests; defaults to a real `window.location.assign` navigation. */
  readonly navigate?: (url: string) => void;
}

function computeResumeState(data: OnboardingResponse | undefined): {
  step: OnboardingStepNumber;
  completed: ReadonlySet<OnboardingStepNumber>;
} {
  if (!data) return { step: 1, completed: new Set() };
  if (data.lastCompletedStep === "WELCOME") {
    return { step: 2, completed: new Set([1]) };
  }
  if (data.lastCompletedStep === "TIME_AND_WEEK") {
    return { step: 3, completed: new Set([1, 2]) };
  }
  if (data.lastCompletedStep === "PLANNING_DEFAULTS") {
    return { step: 4, completed: new Set([1, 2, 3]) };
  }
  return { step: 1, completed: new Set() };
}

export function OnboardingScreen({ navigate = defaultNavigate }: OnboardingScreenProps) {
  const { user } = useAuthSession();
  const logoutMutation = useLogout({ navigate });

  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  });

  const onboardingQuery = useOnboarding();
  const updateWelcomeMutation = useUpdateWelcomeStep();
  const updateTimeAndWeekMutation = useUpdateTimeAndWeekStep();
  const updatePlanningDefaultsMutation = useUpdatePlanningDefaultsStep();
  const completeMutation = useCompleteOnboarding();

  const [userStep, setUserStep] = useState<OnboardingStepNumber | null>(null);
  const [userCompletedSteps, setUserCompletedSteps] =
    useState<ReadonlySet<OnboardingStepNumber> | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const resumeState = useMemo(
    () => computeResumeState(onboardingQuery.data),
    [onboardingQuery.data],
  );
  const activeStep = userStep ?? resumeState.step;
  const completedSteps = userCompletedSteps ?? resumeState.completed;

  useEffect(() => {
    if (
      onboardingQuery.data?.onboardingStatus === "COMPLETED" ||
      onboardingQuery.data?.lastCompletedStep === "START"
    ) {
      navigateRef.current(TODAY_PATH);
    }
  }, [onboardingQuery.data]);

  const userEmail = useMemo(() => {
    return user?.email ?? "";
  }, [user]);

  async function handleWelcomeSubmit(values: WelcomeFormValues) {
    setGlobalError(null);
    try {
      await updateWelcomeMutation.mutateAsync({
        displayName: values.displayName.trim(),
      });
      setUserCompletedSteps(new Set([...completedSteps, 1]));
      setUserStep(2);
    } catch (err: unknown) {
      if (!isProblemValidationError(err)) {
        setGlobalError("Failed to save welcome step. Please try again.");
      }
      throw err;
    }
  }

  async function handleTimeAndWeekSubmit(values: TimeAndWeekFormValues) {
    setGlobalError(null);
    try {
      await updateTimeAndWeekMutation.mutateAsync({
        timeZone: values.timeZone,
        locale: values.locale,
        weekStart: values.weekStart,
      });
      setUserCompletedSteps(new Set([...completedSteps, 1, 2]));
      setUserStep(3);
    } catch (err: unknown) {
      if (!isProblemValidationError(err)) {
        setGlobalError("Failed to save timezone settings. Please try again.");
      }
      throw err;
    }
  }

  async function handlePlanningDefaultsSubmit(values: PlanningDefaultsFormValues) {
    setGlobalError(null);
    try {
      const request: UpdatePlanningDefaultsStepRequest = {
        workingDays: values.workingDays,
        ...(values.workStartTime ? { workStartTime: values.workStartTime } : {}),
        ...(values.workEndTime ? { workEndTime: values.workEndTime } : {}),
        overnightSchedule: values.overnightSchedule,
        ...(values.dailyFocusTargetMinutes !== ""
          ? {
              dailyFocusTargetMinutes: Number(values.dailyFocusTargetMinutes),
            }
          : {}),
        focusDurationMinutes:
          values.focusDurationMinutes === "" ? 25 : Number(values.focusDurationMinutes),
        breakDurationMinutes:
          values.breakDurationMinutes === "" ? 5 : Number(values.breakDurationMinutes),
        skipped: false,
      };

      await updatePlanningDefaultsMutation.mutateAsync(request);
      setUserCompletedSteps(new Set([...completedSteps, 1, 2, 3]));
      setUserStep(4);
    } catch (err: unknown) {
      if (!isProblemValidationError(err)) {
        setGlobalError("Failed to save planning defaults. Please try again.");
      }
      throw err;
    }
  }

  async function handlePlanningDefaultsSkip() {
    setGlobalError(null);
    try {
      await updatePlanningDefaultsMutation.mutateAsync({
        skipped: true,
      });
      setUserCompletedSteps(new Set([...completedSteps, 1, 2, 3]));
      setUserStep(4);
    } catch (err: unknown) {
      setGlobalError("Failed to skip step. Please try again.");
      throw err;
    }
  }

  async function handleFinishSetup() {
    setGlobalError(null);
    try {
      await completeMutation.mutateAsync();
      setUserCompletedSteps(new Set([...completedSteps, 1, 2, 3, 4]));
      navigateRef.current(TODAY_PATH);
    } catch (err: unknown) {
      setGlobalError("Failed to complete onboarding. Please try again.");
      throw err;
    }
  }

  if (onboardingQuery.isLoading) {
    return (
      <div className="lifeos-onboarding-screen lifeos-onboarding-screen--loading">
        <header className="lifeos-onboarding-header">
          <div className="lifeos-onboarding-header__brand">
            <Logo size="sm" />
            <Text weight="semibold">LifeOS</Text>
          </div>
        </header>
        <main className="lifeos-onboarding-main" aria-busy="true">
          <div className="lifeos-onboarding-loading-state">
            <Spinner size="lg" label="Loading onboarding progress..." />
            <Skeleton width="16rem" height="1.5rem" />
          </div>
        </main>
      </div>
    );
  }

  if (onboardingQuery.isError) {
    return (
      <div className="lifeos-onboarding-screen">
        <header className="lifeos-onboarding-header">
          <div className="lifeos-onboarding-header__brand">
            <Logo size="sm" />
            <Text weight="semibold">LifeOS</Text>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            loading={logoutMutation.isPending}
          >
            Sign out
          </Button>
        </header>
        <main className="lifeos-onboarding-main">
          <ErrorState
            scope="page"
            title="We couldn't load your onboarding state"
            description="Your account information could not be retrieved right now. Check your connection and try again."
            onRetry={() => onboardingQuery.refetch()}
          />
        </main>
      </div>
    );
  }

  const onboardingData = onboardingQuery.data;
  const initialDisplayName = onboardingData?.profile?.displayName || user?.displayName || "";
  const initialTimeZone = onboardingData?.profile?.timeZone || user?.timeZone || "";
  const initialLocale = onboardingData?.profile?.locale || user?.locale || "en-US";
  const initialWeekStart = onboardingData?.profile?.weekStart || user?.weekStart || 1;
  const planningDefaults = onboardingData?.planningDefaults;

  return (
    <div className="lifeos-onboarding-screen">
      <header className="lifeos-onboarding-header">
        <div className="lifeos-onboarding-header__brand">
          <Logo size="sm" />
          <Text weight="semibold">LifeOS</Text>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logoutMutation.mutate()}
          loading={logoutMutation.isPending}
        >
          Sign out
        </Button>
      </header>

      <main className="lifeos-onboarding-main" id="lifeos-main-content">
        <div className="lifeos-onboarding-layout">
          <aside className="lifeos-onboarding-layout__rail">
            <OnboardingProgressRail currentStep={activeStep} completedSteps={completedSteps} />
          </aside>

          <section className="lifeos-onboarding-layout__content">
            {globalError && (
              <Alert tone="danger" heading="Error" onDismiss={() => setGlobalError(null)}>
                {globalError}
              </Alert>
            )}

            {activeStep === 1 && (
              <WelcomeStep
                initialDisplayName={initialDisplayName}
                email={userEmail}
                isSubmitting={updateWelcomeMutation.isPending}
                onSubmit={handleWelcomeSubmit}
              />
            )}

            {activeStep === 2 && (
              <TimeAndWeekStep
                initialTimeZone={initialTimeZone}
                initialLocale={initialLocale}
                initialWeekStart={initialWeekStart}
                isSubmitting={updateTimeAndWeekMutation.isPending}
                onBack={() => setUserStep(1)}
                onSubmit={handleTimeAndWeekSubmit}
              />
            )}

            {activeStep === 3 && (
              <PlanningDefaultsStep
                initialWorkingDays={planningDefaults?.workingDays}
                initialWorkStartTime={planningDefaults?.workStartTime}
                initialWorkEndTime={planningDefaults?.workEndTime}
                initialOvernightSchedule={planningDefaults?.overnightSchedule}
                initialDailyFocusTargetMinutes={planningDefaults?.dailyFocusTargetMinutes}
                initialFocusDurationMinutes={planningDefaults?.focusDurationMinutes}
                initialBreakDurationMinutes={planningDefaults?.breakDurationMinutes}
                isSubmitting={updatePlanningDefaultsMutation.isPending}
                onBack={() => setUserStep(2)}
                onSkip={handlePlanningDefaultsSkip}
                onSubmit={handlePlanningDefaultsSubmit}
              />
            )}

            {activeStep === 4 && (
              <StartStep
                isSubmitting={completeMutation.isPending}
                onBack={() => setUserStep(3)}
                onFinish={handleFinishSetup}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function isProblemValidationError(error: unknown): boolean {
  if (error && typeof error === "object" && "problem" in error) {
    const prob = (error as { problem: { status?: number; errors?: unknown[] } }).problem;
    return Boolean(prob?.errors && prob.errors.length > 0);
  }
  return false;
}

function defaultNavigate(url: string): void {
  window.location.assign(url);
}
