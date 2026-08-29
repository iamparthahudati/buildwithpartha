import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { BrainDumpBatchResultDialog } from "./BrainDumpBatchResultDialog";
import type { BatchConvertResult } from "../hooks/useBrainDump";
import type { BrainDumpItem } from "../model/brainDumpItem";

function convertedItem(id: string): BrainDumpItem {
  return {
    id,
    userId: "user-1",
    content: `content ${id}`,
    status: "CONVERTED",
    archived: false,
    version: 1,
    convertedToType: "TASK",
    convertedToId: `task-${id}`,
    convertedAt: "2026-08-29T11:00:00Z",
    archivedAt: null,
    createdAt: "2026-08-29T10:00:00Z",
    updatedAt: "2026-08-29T11:00:00Z",
  };
}

const PARTIAL: BatchConvertResult = {
  target: "TASK",
  results: [
    { id: "bd-1", content: "first", ok: true, item: convertedItem("bd-1") },
    { id: "bd-2", content: "second", ok: false, error: "Version conflict." },
  ],
  successCount: 1,
  failureCount: 1,
};

describe("BrainDumpBatchResultDialog", () => {
  it("returns nothing when there is no result", () => {
    const { container } = render(
      <MemoryRouter>
        <BrainDumpBatchResultDialog open result={null} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("summarises partial results and links successes", () => {
    render(
      <MemoryRouter>
        <BrainDumpBatchResultDialog open result={PARTIAL} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Converted 1 of 2 to Task/i)).toBeInTheDocument();
    expect(screen.getByText("Version conflict.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Task/i })).toHaveAttribute(
      "href",
      "/life-os/app/tasks/task-bd-1",
    );
  });

  it("retries only the failed items", async () => {
    const onRetryFailed = vi.fn();
    render(
      <MemoryRouter>
        <BrainDumpBatchResultDialog
          open
          result={PARTIAL}
          onRetryFailed={onRetryFailed}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Retry 1 failed/i }));
    expect(onRetryFailed).toHaveBeenCalledWith(["bd-2"], "TASK");
  });

  it("hides retry when everything succeeded", () => {
    render(
      <MemoryRouter>
        <BrainDumpBatchResultDialog
          open
          result={{
            target: "NOTE",
            results: [{ id: "bd-1", content: "first", ok: true, item: convertedItem("bd-1") }],
            successCount: 1,
            failureCount: 0,
          }}
          onRetryFailed={vi.fn()}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /Retry/i })).not.toBeInTheDocument();
  });
});
