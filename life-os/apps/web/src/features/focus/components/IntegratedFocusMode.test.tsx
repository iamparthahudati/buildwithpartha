import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithUser } from "@test/render";

import { IntegratedFocusMode } from "./IntegratedFocusMode";

const mocks = vi.hoisted(() => ({
  focus: {} as Record<string, unknown>,
  start: vi.fn(),
  complete: vi.fn(),
  saveInterruption: vi.fn(),
}));

vi.mock("../hooks/useFocusSession", () => ({ useFocusSession: () => mocks.focus }));
vi.mock("@features/user", () => ({
  useUserPreferences: () => ({
    data: { planningDefaults: { focusDurationMinutes: 25, breakDurationMinutes: 5 } },
  }),
}));
vi.mock("@features/tasks", () => ({
  useTaskDetail: (id: string) => ({
    data: id ? { task: { title: "Write release notes" } } : undefined,
  }),
}));
vi.mock("@features/time-blocks", () => ({
  useTimeBlock: (id: string | null) => ({
    data: id ? { title: "Deep work", startTime: "09:00", endTime: "10:00" } : undefined,
  }),
}));

function baseFocusState() {
  return {
    session: null,
    terminalSession: null,
    isLoading: false,
    isError: false,
    online: true,
    totalSeconds: 0,
    remainingSeconds: 0,
    actualFocusDurationSeconds: 0,
    actualBreakDurationSeconds: 0,
    retry: vi.fn(),
    start: mocks.start,
    pause: vi.fn(),
    resume: vi.fn(),
    complete: mocks.complete,
    cancel: vi.fn(),
    skipBreak: vi.fn(),
    saveInterruption: mocks.saveInterruption,
  };
}

describe("IntegratedFocusMode", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.start.mockResolvedValue(undefined);
    mocks.complete.mockResolvedValue(undefined);
    mocks.saveInterruption.mockResolvedValue(undefined);
    mocks.focus = baseFocusState();
  });

  it("starts from deep-linked Task and Time Block context with confirmed defaults", async () => {
    const { user } = renderWithUser(
      <IntegratedFocusMode locale="en-US" taskId="task-1" timeBlockId="block-1" />,
    );

    expect(screen.getByRole("link", { name: "Write release notes" })).toHaveAttribute(
      "href",
      "/life-os/app/tasks/task-1",
    );
    expect(screen.getByRole("link", { name: "Deep work" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start focus" }));
    expect(mocks.start).toHaveBeenCalledWith(1500, "task-1", "block-1", 300);
  });

  it("maps an active server session into controls, context, and confirmed actions", async () => {
    const active = {
      id: "focus-1",
      taskId: "task-1",
      timeBlockId: "block-1",
      status: "RUNNING",
      phase: "FOCUS",
      plannedFocusDurationSeconds: 1500,
      plannedBreakDurationSeconds: 300,
      actualFocusDurationSeconds: 120,
      actualBreakDurationSeconds: 0,
      version: 1,
    };
    mocks.focus = {
      ...baseFocusState(),
      session: active,
      totalSeconds: 1500,
      remainingSeconds: 1380,
    };

    const { user } = renderWithUser(<IntegratedFocusMode locale="en-US" />);
    expect(screen.getByText("23:00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Complete session" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Complete this Focus Session?" })).getByRole(
        "button",
        { name: "Complete session" },
      ),
    );
    expect(mocks.complete).toHaveBeenCalledOnce();

    await user.type(screen.getByRole("textbox", { name: /Distraction note/ }), "Doorbell");
    await user.click(screen.getByRole("button", { name: "Save distraction" }));
    expect(mocks.saveInterruption).toHaveBeenCalledWith("Doorbell");
  });
});
