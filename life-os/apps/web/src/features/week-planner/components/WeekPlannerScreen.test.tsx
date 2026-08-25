import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import {
  MOCK_ALLOCATED_TASKS,
  MOCK_DAY_OPTIONS,
  MOCK_UNSCHEDULED_TASKS,
  MOCK_WEEK_CAPACITY_SUMMARY,
  MOCK_WEEK_CONFLICTS,
  MOCK_WEEK_DAYS,
  MOCK_WEEKLY_OUTCOMES,
} from "../model/mockWeekPlanner";
import { WeekPlannerScreen } from "./WeekPlannerScreen";

describe("WeekPlannerScreen", () => {
  it("renders week planner screen components and passes accessibility checks", async () => {
    const { container } = render(
      <WeekPlannerScreen
        weekLabel="Aug 17 – Aug 23, 2026"
        days={MOCK_WEEK_DAYS}
        capacitySummary={MOCK_WEEK_CAPACITY_SUMMARY}
        outcomes={MOCK_WEEKLY_OUTCOMES}
        unscheduledTasks={MOCK_UNSCHEDULED_TASKS}
        allocatedTasks={MOCK_ALLOCATED_TASKS}
        dayOptions={MOCK_DAY_OPTIONS}
        conflicts={MOCK_WEEK_CONFLICTS}
        selectedDate="2026-08-20"
        status="DRAFT"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Week Planner" })).toBeInTheDocument();
    expect(screen.getByText("DRAFT PLAN")).toBeInTheDocument();
    expect(screen.getByText("Aug 17 – Aug 23, 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize plan" })).toBeInTheDocument();

    // Check conflict warning banner
    expect(screen.getByRole("region", { name: "Planning conflicts alert" })).toBeInTheDocument();
    expect(screen.getByText(/Tuesday, Aug 18 is overcapacity by 2 hours/i)).toBeInTheDocument();

    // Check Weekly Outcomes region
    expect(screen.getByRole("region", { name: "Weekly outcomes" })).toBeInTheDocument();

    // Check Day schedule region
    expect(screen.getByRole("region", { name: "Day schedule" })).toBeInTheDocument();

    // Check Unscheduled queue heading
    expect(screen.getByRole("heading", { name: "Unscheduled tasks" })).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("handles week navigation triggers", async () => {
    const onNavigateWeek = vi.fn();
    render(
      <WeekPlannerScreen
        days={MOCK_WEEK_DAYS}
        capacitySummary={MOCK_WEEK_CAPACITY_SUMMARY}
        onNavigateWeek={onNavigateWeek}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Previous week" }));
    expect(onNavigateWeek).toHaveBeenCalledWith("prev");

    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(onNavigateWeek).toHaveBeenCalledWith("next");

    await userEvent.click(screen.getByRole("button", { name: "This week" }));
    expect(onNavigateWeek).toHaveBeenCalledWith("today");
  });

  it("handles outcome toggle, creation, and reordering", async () => {
    const onSelectOutcome = vi.fn();
    const onCreateOutcome = vi.fn();
    const onReorderOutcomes = vi.fn();

    render(
      <WeekPlannerScreen
        days={MOCK_WEEK_DAYS}
        capacitySummary={MOCK_WEEK_CAPACITY_SUMMARY}
        outcomes={MOCK_WEEKLY_OUTCOMES}
        onSelectOutcome={onSelectOutcome}
        onCreateOutcome={onCreateOutcome}
        onReorderOutcomes={onReorderOutcomes}
      />,
    );

    // Toggle outcome checkbox
    const checkboxes = screen.getAllByRole("checkbox");
    if (checkboxes[0]) {
      await userEvent.click(checkboxes[0]);
      expect(onSelectOutcome).toHaveBeenCalledWith("outcome-1", false);
    }

    // Add outcome
    const addInput = screen.getByRole("textbox", { name: "Outcome" });
    await userEvent.type(addInput, "New Test Outcome");
    const addBtn = screen.getByRole("button", { name: "Add outcome" });
    await userEvent.click(addBtn);
    expect(onCreateOutcome).toHaveBeenCalledWith("New Test Outcome");

    // Reorder outcome
    const moveDownButtons = screen.getAllByRole("button", { name: /Move .* down/i });
    if (moveDownButtons[0]) {
      await userEvent.click(moveDownButtons[0]);
      expect(onReorderOutcomes).toHaveBeenCalled();
    }
  });

  it("handles day capacity adjustment dialog", async () => {
    const onUpdateDayCapacity = vi.fn();

    render(
      <WeekPlannerScreen
        days={MOCK_WEEK_DAYS}
        capacitySummary={MOCK_WEEK_CAPACITY_SUMMARY}
        onUpdateDayCapacity={onUpdateDayCapacity}
      />,
    );

    // Open options menu for Monday and click Adjust capacity
    const menuButtons = screen.getAllByRole("button", { name: /Day actions for/i });
    await userEvent.click(menuButtons[0]!);

    const adjustOption = screen.getByRole("menuitem", { name: /Adjust capacity for/i });
    await userEvent.click(adjustOption);

    expect(screen.getByRole("heading", { name: /Adjust Capacity/i })).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: "Save capacity" });
    await userEvent.click(submitBtn);

    expect(onUpdateDayCapacity).toHaveBeenCalledWith("2026-08-17", expect.any(Number));
  });

  it("handles allocated task unallocate and move dialog", async () => {
    const onAllocateTask = vi.fn();
    const onUnallocateTask = vi.fn();

    render(
      <WeekPlannerScreen
        days={MOCK_WEEK_DAYS}
        capacitySummary={MOCK_WEEK_CAPACITY_SUMMARY}
        allocatedTasks={MOCK_ALLOCATED_TASKS}
        dayOptions={MOCK_DAY_OPTIONS}
        outcomes={MOCK_WEEKLY_OUTCOMES}
        selectedDate="2026-08-20"
        onAllocateTask={onAllocateTask}
        onUnallocateTask={onUnallocateTask}
      />,
    );

    // Click Unallocate on first allocated task
    const unallocateBtns = screen.getAllByRole("button", { name: "Unallocate" });
    await userEvent.click(unallocateBtns[0]!);
    expect(onUnallocateTask).toHaveBeenCalledWith("task-alloc-4");

    // Click Move / Edit on first allocated task
    const moveBtns = screen.getAllByRole("button", { name: "Move / Edit" });
    await userEvent.click(moveBtns[0]!);
    expect(screen.getByRole("heading", { name: /Move task/i })).toBeInTheDocument();

    const daySelect = screen.getByRole("combobox", { name: "Day" });
    await userEvent.selectOptions(daySelect, "2026-08-20");

    const saveTaskBtn = screen.getByRole("button", { name: "Move task" });
    await userEvent.click(saveTaskBtn);
    expect(onAllocateTask).toHaveBeenCalledWith("task-alloc-4", expect.any(Object));
  });

  it("handles unscheduled task queue actions", async () => {
    const onAllocateTask = vi.fn();
    const onCarryOverTask = vi.fn();

    render(
      <WeekPlannerScreen
        days={MOCK_WEEK_DAYS}
        capacitySummary={MOCK_WEEK_CAPACITY_SUMMARY}
        unscheduledTasks={MOCK_UNSCHEDULED_TASKS}
        dayOptions={MOCK_DAY_OPTIONS}
        outcomes={MOCK_WEEKLY_OUTCOMES}
        onAllocateTask={onAllocateTask}
        onCarryOverTask={onCarryOverTask}
      />,
    );

    // Click Allocate on first unscheduled task
    const allocateBtns = screen.getAllByRole("button", { name: "Allocate task" });
    await userEvent.click(allocateBtns[0]!);

    // Selecting day in dialog, then submit
    const daySelect = screen.getByRole("combobox", { name: "Day" });
    await userEvent.selectOptions(daySelect, "2026-08-20");

    const submitBtns = screen.getAllByRole("button", { name: "Allocate task" });
    await userEvent.click(submitBtns[submitBtns.length - 1]!);

    expect(onAllocateTask).toHaveBeenCalledWith(expect.any(String), expect.any(Object));

    // Carry candidate action
    const carryBtns = screen.getAllByRole("button", { name: "Carry task" });
    if (carryBtns[0]) {
      await userEvent.click(carryBtns[0]);
    }
  });

  it("opens finalize plan confirm dialog and triggers onFinalizePlan", async () => {
    const onFinalizePlan = vi.fn().mockResolvedValue(undefined);
    render(
      <WeekPlannerScreen
        days={MOCK_WEEK_DAYS}
        capacitySummary={MOCK_WEEK_CAPACITY_SUMMARY}
        status="DRAFT"
        onFinalizePlan={onFinalizePlan}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Finalize plan" }));
    expect(screen.getByRole("heading", { name: "Finalize week plan?" })).toBeInTheDocument();

    const confirmButtons = screen.getAllByRole("button", { name: "Finalize plan" });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]!);

    expect(onFinalizePlan).toHaveBeenCalledTimes(1);
  });

  it("renders finalized state and opens reopen confirm dialog", async () => {
    const onReopenPlan = vi.fn().mockResolvedValue(undefined);
    render(
      <WeekPlannerScreen
        days={MOCK_WEEK_DAYS}
        capacitySummary={MOCK_WEEK_CAPACITY_SUMMARY}
        status="FINALIZED"
        onReopenPlan={onReopenPlan}
      />,
    );

    expect(screen.getByText("FINALIZED")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen plan" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reopen plan" }));
    expect(screen.getByRole("heading", { name: "Reopen week plan?" })).toBeInTheDocument();

    const confirmButtons = screen.getAllByRole("button", { name: "Reopen plan" });
    await userEvent.click(confirmButtons[confirmButtons.length - 1]!);

    expect(onReopenPlan).toHaveBeenCalledTimes(1);
  });

  it("renders offline banner when isOffline is true", () => {
    render(
      <WeekPlannerScreen
        days={MOCK_WEEK_DAYS}
        capacitySummary={MOCK_WEEK_CAPACITY_SUMMARY}
        isOffline={true}
      />,
    );

    expect(screen.getByText("Offline mode")).toBeInTheDocument();
  });

  it("renders error state when error is provided", () => {
    render(
      <WeekPlannerScreen
        days={MOCK_WEEK_DAYS}
        error="Server failed to load plan"
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("Unable to load week plan")).toBeInTheDocument();
    expect(screen.getAllByText("Server failed to load plan").length).toBeGreaterThan(0);
  });
});
