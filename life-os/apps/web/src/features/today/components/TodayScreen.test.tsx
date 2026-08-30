import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TodayScreen, type TodayScreenProps } from "./TodayScreen";

const noop = vi.fn();

function firstUseProps(): TodayScreenProps {
  return {
    displayName: "Avery",
    timeZone: "Asia/Kolkata",
    locale: "en-IN",
    now: new Date("2026-08-20T04:30:00.000Z"),
    subtitle: "See what needs attention and choose what to do next.",
    onQuickAddClick: noop,
    mitStatus: { type: "empty", message: "No focus chosen yet." },
    tasksStatus: { type: "empty", message: "No tasks planned for today." },
    scheduledTimeStatus: { type: "empty", message: "No Time Blocks scheduled today." },
    focusTimeStatus: { type: "empty", message: "No focus time recorded today." },
    activeProjectsStatus: { type: "empty", message: "No active projects yet." },
    weekProgressStatus: { type: "empty", message: "No Weekly Plan yet." },
    plan: {
      mitState: { type: "empty" },
      tasksState: { type: "empty" },
      onChooseMit: noop,
      onChangeMit: noop,
      onSetMit: noop,
      onMarkDone: noop,
      onStartFocus: noop,
      onAddTask: noop,
    },
    nextUp: {
      status: { type: "empty", availability: "no-focus-selected" },
      sourceLabel: "Open tasks",
      rankingRule: "Priority, then due date, then planned order",
      tasksHref: "/life-os/app/tasks",
    },
    schedule: {
      state: { type: "empty" },
      onAddTimeBlock: noop,
      onStartFocus: noop,
    },
    review: {
      status: {
        type: "ready",
        data: {
          morning: { state: "NOT_STARTED", href: "/life-os/app/reviews" },
          evening: { state: "NOT_STARTED", href: "/life-os/app/reviews" },
          suggestedPeriod: "morning",
        },
      },
      reviewsHref: "/life-os/app/reviews",
    },
    sprintWeek: {
      sprintState: { type: "empty" },
      weekState: { type: "empty" },
    },
    activeProjects: {
      status: { type: "empty" },
      sourceLabel: "Active Projects",
      projectsHref: "/life-os/app/projects",
      onAddProject: noop,
    },
    habits: {
      status: { type: "ready", habits: [] },
      habitsHref: "/life-os/app/habits",
      onSetCount: noop,
    },
    brainCapture: {
      value: "",
      onValueChange: noop,
      onCapture: noop,
      countStatus: { type: "ready", unprocessedCount: 0 },
      captureStatus: { type: "idle" },
      isOnline: true,
      brainDumpHref: "/life-os/app/brain-dump",
    },
  };
}

function readyProps(): TodayScreenProps {
  const firstUse = firstUseProps();
  const focusTask = {
    id: "draft-outline",
    title: "Draft the launch outline",
    href: "/life-os/app/tasks/draft-outline",
    priority: "P1" as const,
    status: "IN_PROGRESS" as const,
    project: { name: "Website launch", href: "/life-os/app/projects/website-launch" },
    isMit: true,
  };

  return {
    ...firstUse,
    mitStatus: { type: "ready", value: "Selected" },
    tasksStatus: { type: "ready", value: "2 of 4" },
    scheduledTimeStatus: { type: "ready", value: "3 h" },
    focusTimeStatus: { type: "ready", value: "45 min" },
    activeProjectsStatus: { type: "ready", value: "2" },
    weekProgressStatus: { type: "ready", value: "5 of 8" },
    plan: {
      ...firstUse.plan,
      mitState: { type: "ready", task: focusTask },
      tasksState: {
        type: "ready",
        tasks: [
          focusTask,
          {
            id: "review-copy",
            title: "Review the landing page copy",
            href: "/life-os/app/tasks/review-copy",
            priority: "P2",
            status: "TO_DO",
          },
        ],
      },
    },
    nextUp: { ...firstUse.nextUp, status: { type: "hidden" } },
    schedule: {
      ...firstUse.schedule,
      state: {
        type: "ready",
        blocks: [
          {
            id: "deep-work",
            title: "Launch outline",
            href: "/life-os/app/time-blocks/deep-work",
            startTime: "10:00",
            endTime: "11:30",
            state: "current",
            category: "Deep work",
          },
        ],
      },
    },
    sprintWeek: {
      sprintState: {
        type: "ready",
        sprint: {
          sprintId: "august-focus",
          name: "August focus",
          startDate: "2026-08-17",
          endDate: "2026-08-30",
          completedStoryPoints: 5,
          totalStoryPoints: 8,
        },
      },
      weekState: { type: "empty" },
    },
    activeProjects: {
      ...firstUse.activeProjects,
      status: {
        type: "ready",
        projects: [
          {
            id: "website-launch",
            name: "Website launch",
            href: "/life-os/app/projects/website-launch",
            completedTasksCount: 3,
            totalTasksCount: 6,
          },
        ],
      },
    },
  };
}

describe("TodayScreen", () => {
  it("composes first-use actions without fabricated Tasks, Time Blocks, Projects, or progress", () => {
    renderWithUser(<TodayScreen {...firstUseProps()} />);

    expect(screen.getByRole("heading", { name: "Today's plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose focus" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add task" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Add time block" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Active projects" })).toBeInTheDocument();
    expect(screen.getByLabelText("What is on your mind?")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("renders normal data and keeps an active focus from showing Next up", () => {
    renderWithUser(<TodayScreen {...readyProps()} />);

    expect(screen.getAllByText("Draft the launch outline").length).toBeGreaterThan(0);
    expect(screen.getByText("Launch outline")).toBeInTheDocument();
    expect(screen.getByText("August focus")).toBeInTheDocument();
    expect(screen.getAllByText("Website launch").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Next up" })).not.toBeInTheDocument();
  });

  it("names an overloaded plan without changing priorities or schedule", () => {
    const props = readyProps();
    renderWithUser(
      <TodayScreen
        {...props}
        planningState={{ type: "overloaded", reviewPlanHref: "/life-os/app/week-planner" }}
      />,
    );

    expect(screen.getByText("Today's plan needs review")).toBeInTheDocument();
    expect(
      screen.getByText(/Nothing was rescheduled and no priority was changed/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review plan" })).toHaveAttribute(
      "href",
      "/life-os/app/week-planner",
    );
  });

  it("isolates a partial failure while preserving successful widgets", () => {
    const props = readyProps();
    renderWithUser(
      <TodayScreen
        {...props}
        plan={{
          ...props.plan,
          tasksState: { type: "error", message: "Try this section again." },
          onRetryTasks: noop,
        }}
      />,
    );

    expect(screen.getByText("Today's tasks couldn't load.")).toBeInTheDocument();
    expect(screen.getByText("Draft the launch outline")).toBeInTheDocument();
    expect(screen.getByText("Launch outline")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows the last update offline and keeps queue language explicit", () => {
    const props = firstUseProps();
    renderWithUser(
      <TodayScreen
        {...props}
        connectionState={{ type: "offline", lastUpdatedLabel: "10:42 AM" }}
        brainCapture={{ ...props.brainCapture, isOnline: false }}
      />,
    );

    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.getByText(/last available Today data from 10:42 AM/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Queue capture" })).toBeInTheDocument();
    expect(screen.getByText(/Queue this capture on this device/)).toBeInTheDocument();
  });

  it("preserves the documented narrow-screen source order and has no accessibility violations", async () => {
    const { container } = renderWithUser(<TodayScreen {...firstUseProps()} />);
    const sections = [...container.querySelectorAll(".lifeos-today-screen__grid > section")];

    expect(
      sections.map((section) => section.getAttribute("class")?.match(/__([\w-]+)/)?.[1]),
    ).toEqual([
      "plan",
      "next-up",
      "schedule",
      "review",
      "sprint-week",
      "projects",
      "habits",
      "brain-capture",
    ]);
    await expectNoAccessibilityViolations(container);
  });
});
