import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expectNoAccessibilityViolations } from "@test/accessibility";

import { DayTimeline } from "./DayTimeline";
import type { TimeBlock } from "../model/timeBlock";

const MOCK_BLOCK_1: TimeBlock = {
  id: "block-1",
  title: "Morning Planning",
  category: "Work",
  categoryColor: "var(--lifeos-chart-1)",
  categoryIcon: "briefcase",
  date: "2026-08-24",
  startTime: "09:00",
  endTime: "10:00",
  status: "COMPLETED",
  completed: true,
};

const MOCK_BLOCK_2: TimeBlock = {
  id: "block-2",
  title: "Deep Work Focus",
  category: "Deep Work",
  categoryColor: "var(--lifeos-chart-2)",
  categoryIcon: "brain",
  date: "2026-08-24",
  startTime: "10:00",
  endTime: "12:00",
  status: "SCHEDULED",
};

const MOCK_BLOCK_OVERLAP_1: TimeBlock = {
  id: "block-3",
  title: "Team Sync",
  category: "Work",
  date: "2026-08-24",
  startTime: "11:00",
  endTime: "12:30",
  status: "SCHEDULED",
  hasConflict: true,
};

describe("DayTimeline", () => {
  const fixedNow = new Date("2026-08-24T10:30:00Z");

  it("renders loading skeleton state with accessible text", () => {
    render(<DayTimeline loading />);
    expect(screen.getByText("Loading timeline grid.")).toBeInTheDocument();
  });

  it("renders grid view with scale hours, title, and blocks", () => {
    render(
      <DayTimeline
        blocks={[MOCK_BLOCK_1, MOCK_BLOCK_2]}
        date="2026-08-24"
        now={fixedNow}
        timeZone="UTC"
      />,
    );

    expect(screen.getByText("Day Timeline")).toBeInTheDocument();
    expect(screen.getByText("2 blocks")).toBeInTheDocument();
    expect(screen.getByText("Morning Planning")).toBeInTheDocument();
    expect(screen.getByText("Deep Work Focus")).toBeInTheDocument();
  });

  it("renders now line indicator when date is today and showNowLine is true", () => {
    render(
      <DayTimeline
        blocks={[MOCK_BLOCK_1]}
        date="2026-08-24"
        now={fixedNow}
        timeZone="UTC"
        showNowLine
      />,
    );

    expect(screen.getByText("10:30 AM")).toBeInTheDocument();
  });

  it("handles side-by-side collision layout for overlapping blocks", () => {
    const { container } = render(
      <DayTimeline
        blocks={[MOCK_BLOCK_2, MOCK_BLOCK_OVERLAP_1]}
        date="2026-08-24"
        now={fixedNow}
        timeZone="UTC"
      />,
    );

    const blocks = container.querySelectorAll(".lifeos-day-timeline__block");
    expect(blocks).toHaveLength(2);

    const firstBlock = blocks[0] as HTMLElement;
    const secondBlock = blocks[1] as HTMLElement;

    expect(firstBlock.style.width).toContain("50%");
    expect(secondBlock.style.width).toContain("50%");
  });

  it("switches density when density buttons are clicked", async () => {
    const user = userEvent.setup();
    const onDensityChange = vi.fn();

    render(
      <DayTimeline
        blocks={[MOCK_BLOCK_1]}
        date="2026-08-24"
        now={fixedNow}
        timeZone="UTC"
        onDensityChange={onDensityChange}
      />,
    );

    const compactBtn = screen.getByRole("button", { name: "Compact density" });
    await user.click(compactBtn);
    expect(onDensityChange).toHaveBeenCalledWith("compact");

    const comfortableBtn = screen.getByRole("button", { name: "Comfortable density" });
    await user.click(comfortableBtn);
    expect(onDensityChange).toHaveBeenCalledWith("comfortable");

    const spaciousBtn = screen.getByRole("button", { name: "Spacious density" });
    await user.click(spaciousBtn);
    expect(onDensityChange).toHaveBeenCalledWith("spacious");
  });

  it("handles internal density and view mode switching when callbacks are omitted", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <DayTimeline blocks={[MOCK_BLOCK_1]} date="2026-08-24" now={fixedNow} timeZone="UTC" />,
    );

    const compactBtn = screen.getByRole("button", { name: "Compact density" });
    await user.click(compactBtn);
    expect(container.querySelector(".lifeos-day-timeline--compact")).toBeInTheDocument();

    const listBtn = screen.getByRole("button", { name: "Switch to list view" });
    await user.click(listBtn);
    expect(screen.getByText("Day Schedule List")).toBeInTheDocument();

    const gridBtn = screen.getByRole("button", {
      name: "Switch to visual timeline grid view",
    });
    await user.click(gridBtn);
    expect(screen.getByText("Day Timeline")).toBeInTheDocument();
  });

  it("switches view mode when view mode buttons are clicked", async () => {
    const user = userEvent.setup();
    const onViewModeChange = vi.fn();

    const { rerender } = render(
      <DayTimeline
        blocks={[MOCK_BLOCK_1]}
        date="2026-08-24"
        now={fixedNow}
        timeZone="UTC"
        onViewModeChange={onViewModeChange}
      />,
    );

    const listBtn = screen.getByRole("button", { name: "Switch to list view" });
    await user.click(listBtn);
    expect(onViewModeChange).toHaveBeenCalledWith("list");

    rerender(
      <DayTimeline
        blocks={[MOCK_BLOCK_1]}
        date="2026-08-24"
        now={fixedNow}
        timeZone="UTC"
        viewMode="list"
        onViewModeChange={onViewModeChange}
      />,
    );

    const gridBtn = screen.getByRole("button", {
      name: "Switch to visual timeline grid view",
    });
    await user.click(gridBtn);
    expect(onViewModeChange).toHaveBeenCalledWith("grid");

    const activeListBtn = screen.getByRole("button", { name: "List view active" });
    await user.click(activeListBtn);
    expect(onViewModeChange).toHaveBeenCalledWith("list");
  });

  it("renders list fallback mode with TimeBlockRow items and empty state", async () => {
    const user = userEvent.setup();
    const onCreateBlock = vi.fn();

    const { rerender } = render(
      <DayTimeline
        blocks={[MOCK_BLOCK_1, MOCK_BLOCK_2]}
        date="2026-08-24"
        now={fixedNow}
        timeZone="UTC"
        viewMode="list"
      />,
    );

    expect(screen.getByText("Day Schedule List")).toBeInTheDocument();
    expect(screen.getByText("Morning Planning")).toBeInTheDocument();
    expect(screen.getByText("Deep Work Focus")).toBeInTheDocument();

    rerender(
      <DayTimeline
        blocks={[]}
        date="2026-08-24"
        now={fixedNow}
        timeZone="UTC"
        viewMode="list"
        onCreateBlock={onCreateBlock}
      />,
    );

    expect(screen.getByText("No time blocks scheduled for this day.")).toBeInTheDocument();
    const createFirstBtn = screen.getByRole("button", { name: "Create first block" });
    await user.click(createFirstBtn);
    expect(onCreateBlock).toHaveBeenCalledWith("09:00", "10:00");
  });

  it("triggers onCreateBlock when slot is clicked or keydown Enter", async () => {
    const user = userEvent.setup();
    const onCreateBlock = vi.fn();

    render(
      <DayTimeline
        blocks={[]}
        date="2026-08-24"
        now={fixedNow}
        timeZone="UTC"
        onCreateBlock={onCreateBlock}
      />,
    );

    const addBtn = screen.getByRole("button", { name: "Add block" });
    await user.click(addBtn);
    expect(onCreateBlock).toHaveBeenCalledWith("09:00", "10:00");

    const slot = screen.getByLabelText("Slot 09:00 to 10:00. Click or press Enter to add block.");
    await user.click(slot);
    expect(onCreateBlock).toHaveBeenCalledWith("09:00", "10:00");

    fireEvent.keyDown(slot, { key: "Enter" });
    expect(onCreateBlock).toHaveBeenCalledWith("09:00", "10:00");
  });

  it("triggers onSelectBlock when block is clicked or Enter pressed", async () => {
    const user = userEvent.setup();
    const onSelectBlock = vi.fn();

    render(
      <DayTimeline
        blocks={[MOCK_BLOCK_1]}
        date="2026-08-24"
        now={fixedNow}
        timeZone="UTC"
        onSelectBlock={onSelectBlock}
      />,
    );

    const blockCard = screen.getByText("Morning Planning");
    await user.click(blockCard);
    expect(onSelectBlock).toHaveBeenCalledWith(MOCK_BLOCK_1);

    const blockElem = screen.getByRole("group", { name: /Time block: Morning Planning/i });
    fireEvent.keyDown(blockElem, { key: "Enter" });
    expect(onSelectBlock).toHaveBeenCalledWith(MOCK_BLOCK_1);
  });

  it("triggers menu callbacks (onStartFocusBlock, onCompleteBlock, onEditBlock, onDuplicateBlock, onDeleteBlock)", async () => {
    const user = userEvent.setup();
    const onStartFocusBlock = vi.fn();
    const onCompleteBlock = vi.fn();
    const onEditBlock = vi.fn();
    const onDuplicateBlock = vi.fn();
    const onDeleteBlock = vi.fn();

    const { container } = render(
      <DayTimeline
        blocks={[MOCK_BLOCK_2]}
        date="2026-08-24"
        now={fixedNow}
        timeZone="UTC"
        onStartFocusBlock={onStartFocusBlock}
        onCompleteBlock={onCompleteBlock}
        onEditBlock={onEditBlock}
        onDuplicateBlock={onDuplicateBlock}
        onDeleteBlock={onDeleteBlock}
      />,
    );

    const menuWrapper = container.querySelector('div[role="presentation"]');
    if (menuWrapper) {
      fireEvent.click(menuWrapper);
      fireEvent.keyDown(menuWrapper, { key: "Enter" });
    }

    const menuTrigger = screen.getByRole("button", { name: "Block menu" });
    await user.click(menuTrigger);

    const focusItem = screen.getByRole("menuitem", { name: "Start focus" });
    await user.click(focusItem);
    expect(onStartFocusBlock).toHaveBeenCalledWith(MOCK_BLOCK_2);

    await user.click(menuTrigger);
    const completeItem = screen.getByRole("menuitem", { name: "Complete" });
    await user.click(completeItem);
    expect(onCompleteBlock).toHaveBeenCalledWith(MOCK_BLOCK_2);

    await user.click(menuTrigger);
    const editItem = screen.getByRole("menuitem", { name: "Edit" });
    await user.click(editItem);
    expect(onEditBlock).toHaveBeenCalledWith(MOCK_BLOCK_2);

    await user.click(menuTrigger);
    const duplicateItem = screen.getByRole("menuitem", { name: "Duplicate" });
    await user.click(duplicateItem);
    expect(onDuplicateBlock).toHaveBeenCalledWith(MOCK_BLOCK_2);

    await user.click(menuTrigger);
    const deleteItem = screen.getByRole("menuitem", { name: "Delete" });
    await user.click(deleteItem);
    expect(onDeleteBlock).toHaveBeenCalledWith(MOCK_BLOCK_2);
  });

  it("handles keyboard navigation: Shift+ArrowDown for move, Alt+ArrowDown for resize", () => {
    const onMoveBlock = vi.fn();
    const onResizeBlock = vi.fn();

    render(
      <DayTimeline
        blocks={[MOCK_BLOCK_1]}
        date="2026-08-24"
        now={fixedNow}
        timeZone="UTC"
        onMoveBlock={onMoveBlock}
        onResizeBlock={onResizeBlock}
      />,
    );

    const blockElem = screen.getByRole("group", {
      name: /Time block: Morning Planning/i,
    });

    fireEvent.keyDown(blockElem, { key: "ArrowDown", shiftKey: true });
    expect(onMoveBlock).toHaveBeenCalledWith("block-1", "09:15", "10:15");

    fireEvent.keyDown(blockElem, { key: "ArrowDown", altKey: true });
    expect(onResizeBlock).toHaveBeenCalledWith("block-1", "10:15");
  });

  it("handles pointer drag to move block position and resize duration", () => {
    const onMoveBlock = vi.fn();
    const onResizeBlock = vi.fn();

    const { container } = render(
      <DayTimeline
        blocks={[MOCK_BLOCK_1]}
        date="2026-08-24"
        now={fixedNow}
        timeZone="UTC"
        onMoveBlock={onMoveBlock}
        onResizeBlock={onResizeBlock}
      />,
    );

    const header = container.querySelector(".lifeos-day-timeline__block-header") as HTMLElement;

    // Move drag
    fireEvent.pointerDown(header, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(header, { clientY: 160, pointerId: 1 });
    fireEvent.pointerUp(header, { pointerId: 1 });

    expect(onMoveBlock).toHaveBeenCalledWith("block-1", "10:00", "11:00");

    // Resize drag
    const resizeHandle = container.querySelector(
      ".lifeos-day-timeline__resize-handle",
    ) as HTMLElement;
    fireEvent.pointerDown(resizeHandle, { clientY: 100, pointerId: 2 });
    fireEvent.pointerMove(resizeHandle, { clientY: 130, pointerId: 2 });
    fireEvent.pointerUp(resizeHandle, { pointerId: 2 });

    expect(onResizeBlock).toHaveBeenCalledWith("block-1", "10:30");
  });

  it("has zero axe accessibility violations", async () => {
    const { container } = render(
      <DayTimeline
        blocks={[MOCK_BLOCK_1, MOCK_BLOCK_2]}
        date="2026-08-24"
        now={fixedNow}
        timeZone="UTC"
      />,
    );

    await expectNoAccessibilityViolations(container);
  });
});
