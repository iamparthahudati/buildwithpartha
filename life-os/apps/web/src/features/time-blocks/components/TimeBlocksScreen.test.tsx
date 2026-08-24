import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expectNoAccessibilityViolations } from "@test/accessibility";

import { TimeBlocksScreen } from "./TimeBlocksScreen";
import {
  MOCK_TIME_BLOCKS,
  MOCK_CONFLICT_TIME_BLOCKS,
  MOCK_WEEK_TIME_BLOCKS,
} from "../model/mockTimeBlocks";
import { computeDayTimeBlockCounts, formatTimeBlocksWeekLabel } from "../model/timeBlocksScreen";

describe("TimeBlocksScreen", () => {
  it("renders page header and default populated Day view timeline", () => {
    render(<TimeBlocksScreen initialDate="2026-08-24" initialBlocks={MOCK_TIME_BLOCKS} />);

    expect(screen.getByRole("heading", { name: "Time Blocks" })).toBeInTheDocument();
    expect(screen.getByText("Monday, Aug 24, 2026")).toBeInTheDocument();
    expect(screen.getByText("Morning Review & Daily Plan")).toBeInTheDocument();
    expect(screen.getByText("Core Architecture Refactor")).toBeInTheDocument();
  });

  it("switches between Day and Week view modes and handles week day selection", async () => {
    const user = userEvent.setup();
    render(<TimeBlocksScreen initialDate="2026-08-24" initialBlocks={MOCK_WEEK_TIME_BLOCKS} />);

    const weekBtn = screen.getByRole("button", { name: "Week" });
    await user.click(weekBtn);

    expect(screen.getByText("Week of Aug 24 – Aug 30, 2026")).toBeInTheDocument();
    const tueCard = screen.getByRole("button", { name: /Tue 25/i });
    expect(tueCard).toBeInTheDocument();

    await user.click(tueCard);
    expect(screen.getByText("Database Schema Migration Review")).toBeInTheDocument();

    const dayBtn = screen.getByRole("button", { name: "Day" });
    await user.click(dayBtn);

    expect(screen.getByText("Tuesday, Aug 25, 2026")).toBeInTheDocument();
  });

  it("navigates previous day, next day, and today", async () => {
    const user = userEvent.setup();
    render(<TimeBlocksScreen initialDate="2026-08-24" initialBlocks={MOCK_TIME_BLOCKS} />);

    const nextBtn = screen.getByRole("button", { name: "Next day" });
    await user.click(nextBtn);
    expect(screen.getByText("Tuesday, Aug 25, 2026")).toBeInTheDocument();

    const prevBtn = screen.getByRole("button", { name: "Previous day" });
    await user.click(prevBtn);
    expect(screen.getByText("Monday, Aug 24, 2026")).toBeInTheDocument();

    const todayBtn = screen.getByRole("button", { name: "Today" });
    await user.click(todayBtn);
    expect(screen.getByRole("heading", { name: "Time Blocks" })).toBeInTheDocument();
  });

  it("toggles focus mode filter", async () => {
    const user = userEvent.setup();
    render(<TimeBlocksScreen initialDate="2026-08-24" initialBlocks={MOCK_TIME_BLOCKS} />);

    const focusToggle = screen.getByRole("button", { name: /focus mode/i });
    await user.click(focusToggle);

    expect(focusToggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Core Architecture Refactor")).toBeInTheDocument();
  });

  it("toggles time summary sidebar visibility", async () => {
    const user = userEvent.setup();
    render(<TimeBlocksScreen initialDate="2026-08-24" initialBlocks={MOCK_TIME_BLOCKS} />);

    expect(screen.getByRole("region", { name: "Time summary overview" })).toBeInTheDocument();

    const summaryToggle = screen.getByRole("button", { name: /summary/i });
    await user.click(summaryToggle);

    expect(screen.queryByRole("region", { name: "Time summary overview" })).not.toBeInTheDocument();
  });

  it("opens and submits create block form dialog with custom and fallback handlers", async () => {
    const user = userEvent.setup();
    const handleCreate = vi.fn();
    const { rerender } = render(
      <TimeBlocksScreen
        initialDate="2026-08-24"
        initialBlocks={MOCK_TIME_BLOCKS}
        onCreateBlockSubmit={handleCreate}
      />,
    );

    const addBtn = screen.getAllByRole("button", { name: "Add block" })[0]!;
    await user.click(addBtn);

    expect(screen.getByRole("heading", { name: "Create time block" })).toBeInTheDocument();

    const titleInput = screen.getByRole("textbox", { name: /title/i });
    await user.type(titleInput, "New Test Time Block");

    const saveBtn = screen.getByRole("button", { name: "Create time block" });
    await user.click(saveBtn);

    expect(handleCreate).toHaveBeenCalled();

    // Internal state fallback test
    rerender(<TimeBlocksScreen initialDate="2026-08-24" initialBlocks={MOCK_TIME_BLOCKS} />);
    const addBtn2 = screen.getAllByRole("button", { name: "Add block" })[0]!;
    await user.click(addBtn2);
    const titleInput2 = screen.getByRole("textbox", { name: /title/i });
    await user.type(titleInput2, "Fallback Created Block");
    const saveBtn2 = screen.getByRole("button", { name: "Create time block" });
    await user.click(saveBtn2);
    expect(screen.getAllByText("Fallback Created Block")[0]).toBeInTheDocument();
  });

  it("handles edit, complete, duplicate, start focus, and delete operations", async () => {
    const user = userEvent.setup();
    const handleStartFocus = vi.fn();
    const handleEditSubmit = vi.fn();

    render(
      <TimeBlocksScreen
        initialDate="2026-08-24"
        initialBlocks={MOCK_TIME_BLOCKS}
        onStartFocus={handleStartFocus}
        onEditBlockSubmit={handleEditSubmit}
      />,
    );

    const blockMenus = screen.getAllByRole("button", { name: "Block menu" });
    await user.click(blockMenus[1]!); // tb-2 (IN_PROGRESS)

    const focusItem = screen.getByRole("menuitem", { name: "Start focus" });
    await user.click(focusItem);
    expect(handleStartFocus).toHaveBeenCalled();

    await user.click(blockMenus[1]!);
    const editItem = screen.getByRole("menuitem", { name: "Edit" });
    await user.click(editItem);

    expect(screen.getByRole("heading", { name: "Edit time block" })).toBeInTheDocument();
    const saveEditBtn = screen.getByRole("button", { name: "Save changes" });
    await user.click(saveEditBtn);
    expect(handleEditSubmit).toHaveBeenCalled();

    // Complete & Duplicate
    await user.click(blockMenus[2]!); // tb-3 (SCHEDULED)
    const completeItem = screen.getByRole("menuitem", { name: "Complete" });
    await user.click(completeItem);

    await user.click(blockMenus[2]!);
    const duplicateItem = screen.getByRole("menuitem", { name: "Duplicate" });
    await user.click(duplicateItem);
    expect(screen.getAllByText("Team Standup & Sprint Sync (Copy)")[0]).toBeInTheDocument();
  });

  it("opens delete confirmation dialog and confirms deletion with fallback", async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();

    const { rerender } = render(
      <TimeBlocksScreen
        initialDate="2026-08-24"
        initialBlocks={MOCK_TIME_BLOCKS}
        onDeleteBlockConfirm={handleDelete}
      />,
    );

    const blockMenus = screen.getAllByRole("button", { name: "Block menu" });
    await user.click(blockMenus[0]!);

    const deleteMenuItem = screen.getByRole("menuitem", { name: "Delete" });
    await user.click(deleteMenuItem);

    expect(screen.getByRole("heading", { name: "Delete time block" })).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmDeleteBtn);
    expect(handleDelete).toHaveBeenCalled();

    // Fallback internal delete
    rerender(<TimeBlocksScreen initialDate="2026-08-24" initialBlocks={MOCK_TIME_BLOCKS} />);
    const blockMenus2 = screen.getAllByRole("button", { name: "Block menu" });
    await user.click(blockMenus2[0]!);
    const deleteMenuItem2 = screen.getByRole("menuitem", { name: "Delete" });
    await user.click(deleteMenuItem2);
    const confirmDeleteBtn2 = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmDeleteBtn2);
    expect(screen.queryByText("Morning Review & Daily Plan")).not.toBeInTheDocument();
  });

  it("renders offline alert banner", () => {
    render(
      <TimeBlocksScreen isOffline initialDate="2026-08-24" initialBlocks={MOCK_TIME_BLOCKS} />,
    );
    expect(screen.getByText("Working offline")).toBeInTheDocument();
    expect(screen.getByText(/changes will be saved as device drafts/i)).toBeInTheDocument();
  });

  it("renders DST transition notice banner", () => {
    render(
      <TimeBlocksScreen
        dstNotice="Daylight Saving Time transition: 23 hours in day"
        initialDate="2026-08-24"
        initialBlocks={MOCK_TIME_BLOCKS}
      />,
    );
    expect(screen.getByText("Daylight Saving Time transition")).toBeInTheDocument();
    expect(
      screen.getByText("Daylight Saving Time transition: 23 hours in day"),
    ).toBeInTheDocument();
  });

  it("renders overlap conflict alert banner", () => {
    render(<TimeBlocksScreen initialDate="2026-08-24" initialBlocks={MOCK_CONFLICT_TIME_BLOCKS} />);
    expect(screen.getByText("Overlap conflict detected")).toBeInTheDocument();
  });

  it("renders error state with retry button", async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();

    render(
      <TimeBlocksScreen
        error="Network error fetching time blocks"
        onRetry={handleRetry}
        initialDate="2026-08-24"
        initialBlocks={[]}
      />,
    );

    expect(screen.getByText("Failed to load time blocks")).toBeInTheDocument();
    expect(screen.getByText("Network error fetching time blocks")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "Retry" });
    await user.click(retryBtn);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("correctly computes day time block counts and formats week label", () => {
    const counts = computeDayTimeBlockCounts(MOCK_TIME_BLOCKS);
    expect(counts.total).toBe(5);
    expect(counts.completed).toBe(1);
    expect(counts.inProgress).toBe(1);
    expect(counts.scheduled).toBe(3);

    const weekLabel = formatTimeBlocksWeekLabel("2026-08-24");
    expect(weekLabel).toBe("Week of Aug 24 – Aug 30, 2026");
  });

  it("passes accessibility audit (axe)", async () => {
    const { container } = render(
      <TimeBlocksScreen initialDate="2026-08-24" initialBlocks={MOCK_TIME_BLOCKS} />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
