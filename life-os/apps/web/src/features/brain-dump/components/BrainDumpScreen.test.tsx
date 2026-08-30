import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { BrainDumpItem } from "../model/brainDumpItem";
import { BrainDumpScreen, type BrainDumpScreenProps } from "./BrainDumpScreen";

const ITEM: BrainDumpItem = {
  id: "item-1",
  userId: "user-1",
  content: "Plan the next release",
  status: "UNPROCESSED",
  archived: false,
  version: 0,
  convertedToType: null,
  convertedToId: null,
  convertedAt: null,
  archivedAt: null,
  createdAt: "2026-08-30T10:00:00Z",
  updatedAt: "2026-08-30T10:00:00Z",
};

function renderScreen(overrides: Partial<BrainDumpScreenProps> = {}) {
  const props: BrainDumpScreenProps = {
    items: [ITEM],
    loading: false,
    error: null,
    searchQuery: "",
    onSearchQueryChange: vi.fn(),
    statusFilter: "UNPROCESSED",
    onStatusFilterChange: vi.fn(),
    showArchived: false,
    onShowArchivedChange: vi.fn(),
    captureStatus: { type: "idle" },
    isOnline: true,
    onCapture: vi.fn(),
    queuedCount: 2,
    flushing: false,
    onFlushQueue: vi.fn(),
    onDiscardQueued: vi.fn(),
    onDefer: vi.fn(),
    onArchiveToggle: vi.fn(),
    onDelete: vi.fn(),
    onConvertSubmit: vi.fn(),
    convertPending: false,
    convertError: null,
    convertResult: null,
    onConvertDismiss: vi.fn(),
    onBatchConvert: vi.fn(),
    batchPending: false,
    batchResult: {
      target: "TASK",
      successCount: 0,
      failureCount: 1,
      results: [{ id: ITEM.id, content: ITEM.content, ok: false, error: "Try again" }],
    },
    onBatchDismiss: vi.fn(),
    ...overrides,
  };

  render(
    <MemoryRouter>
      <BrainDumpScreen {...props} />
    </MemoryRouter>,
  );
  return props;
}

describe("BrainDumpScreen", () => {
  it("drives filtering, queue, item, conversion, and batch callbacks", async () => {
    const user = userEvent.setup();
    const props = renderScreen();

    const search = screen.getByRole("searchbox", { name: "Search Brain Dump items" });
    await user.type(search, "release");
    await user.clear(search);
    expect(props.onSearchQueryChange).toHaveBeenCalledWith("");

    await user.selectOptions(screen.getByLabelText("Show archived"), "yes");
    expect(props.onShowArchivedChange).toHaveBeenCalledWith(true);
    await user.click(screen.getByRole("tab", { name: "Deferred" }));
    expect(props.onStatusFilterChange).toHaveBeenCalledWith("DEFERRED");

    await user.click(screen.getByRole("button", { name: "Sync now" }));
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(props.onFlushQueue).toHaveBeenCalled();
    expect(props.onDiscardQueued).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Convert to Note" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Convert to Project" }));
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("checkbox", { name: /Select item/ }));
    await user.selectOptions(screen.getByLabelText("Convert selected to"), "NOTE");
    await user.click(screen.getAllByRole("button", { name: "Convert to Note" })[0]!);
    expect(props.onBatchConvert).toHaveBeenCalledWith([ITEM], "NOTE");
    await user.click(screen.getByRole("button", { name: "Clear" }));

    await user.click(screen.getByRole("button", { name: "Defer item" }));
    await user.click(screen.getByRole("button", { name: "Archive item" }));
    expect(props.onDefer).toHaveBeenCalledWith(ITEM);
    expect(props.onArchiveToggle).toHaveBeenCalledWith(ITEM);

    await user.click(screen.getByRole("button", { name: "Delete item" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(props.onDelete).toHaveBeenCalledWith(ITEM);

    await user.click(screen.getByRole("button", { name: "Convert to Goal" }));
    await user.keyboard("{Escape}");
    expect(props.onConvertDismiss).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Retry 1 failed" }));
    expect(props.onBatchConvert).toHaveBeenLastCalledWith([ITEM], "TASK");
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(props.onBatchDismiss).toHaveBeenCalled();
  });
});
