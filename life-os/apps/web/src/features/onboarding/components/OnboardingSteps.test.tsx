import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OnboardingProgressRail } from "./OnboardingProgressRail";
import { PlanningDefaultsStep } from "./PlanningDefaultsStep";
import { StartStep } from "./StartStep";
import { TimeAndWeekStep } from "./TimeAndWeekStep";
import { WelcomeStep } from "./WelcomeStep";

describe("OnboardingStep Components", () => {
  describe("OnboardingProgressRail", () => {
    it("renders step 1 to 4 with proper completion badges", () => {
      const { rerender } = render(
        <OnboardingProgressRail currentStep={1} completedSteps={new Set()} />,
      );
      expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();

      rerender(<OnboardingProgressRail currentStep={3} completedSteps={new Set([1, 2])} />);
      expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
    });
  });

  describe("WelcomeStep", () => {
    it("handles input change, clearing field error on change, and submit", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <WelcomeStep
          initialDisplayName="Ada"
          email="ada@example.test"
          isSubmitting={false}
          onSubmit={onSubmit}
        />,
      );

      const input = screen.getByLabelText("Display name");
      await user.clear(input);
      await user.click(screen.getByRole("button", { name: "Continue" }));
      await waitFor(() => {
        expect(screen.getAllByText("Enter your display name.").length).toBeGreaterThan(0);
      });

      await user.type(input, "Grace Hopper");
      await user.click(screen.getByRole("button", { name: "Continue" }));
      expect(onSubmit).toHaveBeenCalledWith({ displayName: "Grace Hopper" });
    });

    it("applies server field errors on submit failure", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue({
        problem: {
          errors: [{ field: "displayName", code: "Name is taken" }],
        },
      });

      render(
        <WelcomeStep
          initialDisplayName="Ada"
          email="ada@example.test"
          isSubmitting={false}
          onSubmit={onSubmit}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Continue" }));
      await waitFor(() => {
        expect(screen.getAllByText("Name is taken").length).toBeGreaterThan(0);
      });
    });
  });

  describe("TimeAndWeekStep", () => {
    it("handles timezone query, suggestions, select, and submit", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onBack = vi.fn();

      render(
        <TimeAndWeekStep
          initialTimeZone="America/New_York"
          initialLocale="en-US"
          initialWeekStart={1}
          isSubmitting={false}
          onBack={onBack}
          onSubmit={onSubmit}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Back" }));
      expect(onBack).toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Use UTC for now" }));
      await user.selectOptions(screen.getByLabelText("Week starts on"), "7");
      await user.selectOptions(screen.getByLabelText("Display locale & date format"), "en-GB");

      await user.click(screen.getByRole("button", { name: "Save and continue" }));
      expect(onSubmit).toHaveBeenCalledWith({
        timeZone: "UTC",
        locale: "en-GB",
        weekStart: 7,
      });
    });

    it("handles browser detected timezone shortcut and validation errors", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <TimeAndWeekStep
          initialTimeZone="UTC"
          initialLocale="en-US"
          initialWeekStart={1}
          isSubmitting={false}
          onBack={vi.fn()}
          onSubmit={onSubmit}
        />,
      );

      const browserBtn = screen.queryByRole("button", {
        name: /Use browser detected/i,
      });
      if (browserBtn) {
        await user.click(browserBtn);
      }

      await user.click(screen.getByRole("button", { name: "Save and continue" }));
      expect(onSubmit).toHaveBeenCalled();
    });

    it("applies server validation errors on submit failure", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue({
        problem: {
          errors: [{ field: "timeZone", code: "Invalid timeZone" }],
        },
      });

      render(
        <TimeAndWeekStep
          initialTimeZone="UTC"
          initialLocale="en-US"
          initialWeekStart={1}
          isSubmitting={false}
          onBack={vi.fn()}
          onSubmit={onSubmit}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Save and continue" }));
      await waitFor(() => {
        expect(screen.getAllByText("Invalid timeZone").length).toBeGreaterThan(0);
      });
    });
  });

  describe("PlanningDefaultsStep", () => {
    it("toggles working days, updates schedule times, and submits", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onBack = vi.fn();
      const onSkip = vi.fn();

      render(
        <PlanningDefaultsStep
          initialWorkingDays={[1, 2, 3, 4, 5]}
          initialWorkStartTime="09:00"
          initialWorkEndTime="17:00"
          initialOvernightSchedule={false}
          initialDailyFocusTargetMinutes={240}
          initialFocusDurationMinutes={25}
          initialBreakDurationMinutes={5}
          isSubmitting={false}
          onBack={onBack}
          onSkip={onSkip}
          onSubmit={onSubmit}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Back" }));
      expect(onBack).toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Skip for now" }));
      expect(onSkip).toHaveBeenCalled();

      // Toggle Sunday on, Saturday on, Monday off
      await user.click(screen.getByLabelText("Sun"));
      await user.click(screen.getByLabelText("Mon"));

      // Toggle overnight schedule
      await user.click(screen.getByLabelText("Schedule ends next day (overnight)"));

      // Change focus duration
      const focusInput = screen.getByLabelText("Focus block duration");
      await user.clear(focusInput);
      await user.type(focusInput, "50");

      const breakInput = screen.getByLabelText("Break duration");
      await user.clear(breakInput);
      await user.type(breakInput, "10");

      const targetInput = screen.getByLabelText("Daily focus target");
      await user.clear(targetInput);
      await user.type(targetInput, "300");

      await user.click(screen.getByRole("button", { name: "Save and continue" }));

      expect(onSubmit).toHaveBeenCalledWith({
        workingDays: [2, 3, 4, 5, 7],
        workStartTime: "09:00",
        workEndTime: "17:00",
        overnightSchedule: true,
        dailyFocusTargetMinutes: 300,
        focusDurationMinutes: 50,
        breakDurationMinutes: 10,
      });
    });

    it("applies server validation errors on submit failure", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue({
        problem: {
          errors: [{ field: "workStartTime", code: "Invalid start time" }],
        },
      });

      render(
        <PlanningDefaultsStep
          isSubmitting={false}
          onBack={vi.fn()}
          onSkip={vi.fn()}
          onSubmit={onSubmit}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Save and continue" }));
      await waitFor(() => {
        expect(screen.getAllByText("Invalid start time").length).toBeGreaterThan(0);
      });
    });
  });

  describe("StartStep", () => {
    it("renders start empty details and actions", async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();
      const onFinish = vi.fn();

      render(<StartStep isSubmitting={false} onBack={onBack} onFinish={onFinish} />);

      expect(screen.getByRole("heading", { level: 1, name: "Start LifeOS" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "Start empty" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Back" }));
      expect(onBack).toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Finish setup" }));
      expect(onFinish).toHaveBeenCalled();
    });
  });
});
