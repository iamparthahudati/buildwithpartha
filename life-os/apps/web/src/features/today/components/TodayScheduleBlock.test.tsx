import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { TodayScheduleBlock as TodayScheduleBlockModel } from "../model/todaySchedule";
import { TodayScheduleBlock } from "./TodayScheduleBlock";

const BLOCK: TodayScheduleBlockModel = {
  id: "block-1",
  title: "Write launch outline",
  href: "/life-os/app/time-blocks/block-1",
  startTime: "09:30",
  endTime: "10:15",
  state: "current",
  category: "Deep work",
  project: {
    id: "project-1",
    name: "Website launch",
    href: "/life-os/app/projects/project-1",
  },
  conflictDescriptions: ["This Time Block overlaps Design review by 15 minutes."],
};

describe("TodayScheduleBlock", () => {
  it("shows local time, context, current and conflict states as visible text", () => {
    renderWithUser(
      <ol>
        <TodayScheduleBlock block={BLOCK} locale="en-US" onStartFocus={vi.fn()} />
      </ol>,
    );

    expect(screen.getByText("9:30 AM – 10:15 AM")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Write launch outline" })).toHaveAttribute(
      "href",
      BLOCK.href,
    );
    expect(screen.getByRole("link", { name: "Website launch" })).toHaveAttribute(
      "href",
      BLOCK.project?.href,
    );
    expect(screen.getByText("Deep work")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Conflict")).toBeInTheDocument();
    expect(
      screen.getByText("This Time Block overlaps Design review by 15 minutes."),
    ).toBeInTheDocument();
  });

  it("routes start-focus and open actions to their canonical targets", async () => {
    const onStartFocus = vi.fn();
    const { user } = renderWithUser(
      <ol>
        <TodayScheduleBlock block={BLOCK} locale="en-US" onStartFocus={onStartFocus} />
      </ol>,
    );

    await user.click(screen.getByRole("button", { name: "Start focus" }));
    expect(onStartFocus).toHaveBeenCalledOnce();
    expect(onStartFocus).toHaveBeenCalledWith("block-1");
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", BLOCK.href);
  });

  it("keeps a pending start focusable and blocks other disabled starts with a reason", async () => {
    const onStartFocus = vi.fn();
    const { user, rerender } = renderWithUser(
      <ol>
        <TodayScheduleBlock block={BLOCK} locale="en-US" onStartFocus={onStartFocus} starting />
      </ol>,
    );

    const pending = screen.getByRole("button", { name: "Start focus" });
    expect(pending).toHaveAttribute("aria-busy", "true");
    expect(pending).toHaveAttribute("aria-disabled", "true");
    expect(pending).not.toBeDisabled();
    await user.click(pending);
    expect(onStartFocus).not.toHaveBeenCalled();

    rerender(
      <ol>
        <TodayScheduleBlock
          block={BLOCK}
          locale="en-US"
          onStartFocus={onStartFocus}
          startDisabled
          startDisabledReason="A focus session is already active."
        />
      </ol>,
    );
    expect(screen.getByRole("button", { name: "Start focus" })).toHaveAttribute(
      "title",
      "A focus session is already active.",
    );
  });

  it("does not offer Start focus for completed or ordinary upcoming Time Blocks", () => {
    const { rerender } = renderWithUser(
      <ol>
        <TodayScheduleBlock
          block={{ ...BLOCK, state: "completed" }}
          locale="en-US"
          onStartFocus={vi.fn()}
        />
      </ol>,
    );
    expect(screen.queryByRole("button", { name: "Start focus" })).not.toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();

    rerender(
      <ol>
        <TodayScheduleBlock
          block={{ ...BLOCK, state: "upcoming" }}
          locale="en-US"
          onStartFocus={vi.fn()}
        />
      </ol>,
    );
    expect(screen.queryByRole("button", { name: "Start focus" })).not.toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithUser(
      <ol>
        <TodayScheduleBlock block={BLOCK} locale="en-US" onStartFocus={vi.fn()} />
      </ol>,
    );
    await expectNoAccessibilityViolations(container);
  });
});
