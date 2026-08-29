import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { BrainDumpItemRow } from "./BrainDumpItemRow";
import type { BrainDumpItem } from "../model/brainDumpItem";

const MOCK_ITEM: BrainDumpItem = {
  id: "bd-1",
  userId: "user-1",
  content: "Read the book on systems thinking",
  status: "UNPROCESSED",
  archived: false,
  version: 0,
  convertedToType: null,
  convertedToId: null,
  convertedAt: null,
  archivedAt: null,
  createdAt: "2026-08-29T10:00:00Z",
  updatedAt: "2026-08-29T10:00:00Z",
};

describe("BrainDumpItemRow", () => {
  it("renders item content and status badge", () => {
    render(<BrainDumpItemRow item={MOCK_ITEM} />);

    expect(screen.getByText("Read the book on systems thinking")).toBeInTheDocument();
    expect(screen.getByText("Unprocessed")).toBeInTheDocument();
  });

  it("triggers defer action", async () => {
    const onDefer = vi.fn();
    render(<BrainDumpItemRow item={MOCK_ITEM} onDefer={onDefer} />);

    await userEvent.click(screen.getByRole("button", { name: "Defer item" }));
    expect(onDefer).toHaveBeenCalledWith(MOCK_ITEM);
  });

  it("triggers archive action", async () => {
    const onArchiveToggle = vi.fn();
    render(<BrainDumpItemRow item={MOCK_ITEM} onArchiveToggle={onArchiveToggle} />);

    await userEvent.click(screen.getByRole("button", { name: "Archive item" }));
    expect(onArchiveToggle).toHaveBeenCalledWith(MOCK_ITEM);
  });

  it("shows restore button for archived item", async () => {
    const archivedItem = { ...MOCK_ITEM, archived: true };
    const onArchiveToggle = vi.fn();
    render(<BrainDumpItemRow item={archivedItem} onArchiveToggle={onArchiveToggle} />);

    await userEvent.click(screen.getByRole("button", { name: "Restore item" }));
    expect(onArchiveToggle).toHaveBeenCalledWith(archivedItem);
  });

  it("triggers delete action", async () => {
    const onDelete = vi.fn();
    render(<BrainDumpItemRow item={MOCK_ITEM} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete item" }));
    expect(onDelete).toHaveBeenCalledWith(MOCK_ITEM);
  });

  it("shows convert buttons for unprocessed items", () => {
    render(
      <BrainDumpItemRow
        item={MOCK_ITEM}
        onConvertToTask={vi.fn()}
        onConvertToNote={vi.fn()}
        onConvertToProject={vi.fn()}
        onConvertToGoal={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Convert to Task" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert to Note" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert to Project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert to Goal" })).toBeInTheDocument();
  });

  it("hides convert buttons for converted items", () => {
    const convertedItem = { ...MOCK_ITEM, status: "CONVERTED" as const };
    render(
      <BrainDumpItemRow item={convertedItem} onConvertToTask={vi.fn()} onConvertToNote={vi.fn()} />,
    );

    expect(screen.queryByRole("button", { name: "Convert to Task" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Convert to Note" })).not.toBeInTheDocument();
  });

  it("triggers convertToTask action", async () => {
    const onConvertToTask = vi.fn();
    render(<BrainDumpItemRow item={MOCK_ITEM} onConvertToTask={onConvertToTask} />);

    await userEvent.click(screen.getByRole("button", { name: "Convert to Task" }));
    expect(onConvertToTask).toHaveBeenCalledWith(MOCK_ITEM);
  });

  it("renders loading skeleton correctly", () => {
    const { container } = render(<BrainDumpItemRow loading />);
    expect(container.querySelector(".lifeos-brain-dump-item-row--loading")).toBeInTheDocument();
  });

  it("meets accessibility requirements", async () => {
    const { container } = render(
      <BrainDumpItemRow
        item={MOCK_ITEM}
        onDefer={vi.fn()}
        onArchiveToggle={vi.fn()}
        onDelete={vi.fn()}
        onConvertToTask={vi.fn()}
        onConvertToNote={vi.fn()}
        onConvertToProject={vi.fn()}
        onConvertToGoal={vi.fn()}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
