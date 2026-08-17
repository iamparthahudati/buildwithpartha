import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { AttachmentList, type Attachment } from "./AttachmentList";

const ATTACHMENTS: readonly Attachment[] = [
  {
    id: "uploading",
    fileName: "brief.pdf",
    fileSizeBytes: 2048,
    status: "uploading",
    uploadProgress: 40,
  },
  { id: "scanning", fileName: "photo.png", fileSizeBytes: 4096, status: "scanning" },
  { id: "ready", fileName: "contract.pdf", fileSizeBytes: 8192, status: "ready" },
  { id: "blocked", fileName: "archive.zip", fileSizeBytes: 1024, status: "blocked" },
  {
    id: "failed",
    fileName: "notes.docx",
    fileSizeBytes: 512,
    status: "failed",
    error: "The connection dropped.",
  },
];

const BASE_PROPS = {
  label: "Attachments",
  locale: "en-US",
  emptyTitle: "No attachments yet",
};

describe("AttachmentList", () => {
  it("renders a real, labelled list with one item per attachment", () => {
    renderWithUser(<AttachmentList {...BASE_PROPS} attachments={ATTACHMENTS} />);
    const list = screen.getByRole("list", { name: "Attachments" });
    expect(list.tagName).toBe("UL");
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("shows an EmptyState when there are no attachments", () => {
    renderWithUser(<AttachmentList {...BASE_PROPS} attachments={[]} />);
    expect(screen.getByText("No attachments yet")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Attachments" })).not.toBeInTheDocument();
  });

  it("renders the uploading progress with the tone guide's exact copy", () => {
    renderWithUser(<AttachmentList {...BASE_PROPS} attachments={ATTACHMENTS} />);
    expect(screen.getByRole("progressbar", { name: /Uploading brief\.pdf/ })).toHaveAttribute(
      "aria-valuetext",
      "Uploading brief.pdf: 40%",
    );
  });

  it("reads a missing uploadProgress as 0 rather than leaving the value undefined", () => {
    renderWithUser(
      <AttachmentList
        {...BASE_PROPS}
        attachments={[
          { id: "fresh", fileName: "new.pdf", fileSizeBytes: 100, status: "uploading" },
        ]}
      />,
    );
    expect(screen.getByRole("progressbar", { name: /Uploading new\.pdf/ })).toHaveAttribute(
      "aria-valuetext",
      "Uploading new.pdf: 0%",
    );
  });

  it("renders a scanning row with a labelled spinner and no ready/blocked badge", () => {
    renderWithUser(<AttachmentList {...BASE_PROPS} attachments={ATTACHMENTS} />);
    expect(screen.getByText("Scanning photo.png…")).toBeInTheDocument();
  });

  it("renders a blocked row's generic explanation without naming a scanner reason", () => {
    renderWithUser(<AttachmentList {...BASE_PROPS} attachments={ATTACHMENTS} />);
    expect(
      screen.getByText("This file didn’t pass a safety check and isn’t available."),
    ).toBeInTheDocument();
  });

  it("renders a failed row's own error message", () => {
    renderWithUser(<AttachmentList {...BASE_PROPS} attachments={ATTACHMENTS} />);
    expect(screen.getByText("The connection dropped.")).toBeInTheDocument();
  });

  it("only renders cancel/retry/download/delete controls whose handler is given", async () => {
    const onCancel = vi.fn();
    const onRetry = vi.fn();
    const { user } = renderWithUser(
      <AttachmentList
        {...BASE_PROPS}
        attachments={ATTACHMENTS}
        onCancel={onCancel}
        onRetry={onRetry}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel uploading brief.pdf" }));
    expect(onCancel).toHaveBeenCalledWith("uploading");

    await user.click(screen.getByRole("button", { name: "Retry uploading notes.docx" }));
    expect(onRetry).toHaveBeenCalledWith("failed");

    expect(screen.queryByRole("button", { name: /^Download/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete/ })).not.toBeInTheDocument();
  });

  it("calls onDownload with the attachment id for a ready file", async () => {
    const onDownload = vi.fn();
    const { user } = renderWithUser(
      <AttachmentList {...BASE_PROPS} attachments={ATTACHMENTS} onDownload={onDownload} />,
    );

    await user.click(screen.getByRole("button", { name: "Download contract.pdf" }));
    expect(onDownload).toHaveBeenCalledWith("ready");
  });

  it("does not offer delete on an uploading or scanning row", () => {
    renderWithUser(
      <AttachmentList {...BASE_PROPS} attachments={ATTACHMENTS} onDelete={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: "Delete brief.pdf" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete photo.png" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete contract.pdf" })).toBeInTheDocument();
  });

  it("confirms before deleting, naming the exact file", async () => {
    const onDelete = vi.fn();
    const { user } = renderWithUser(
      <AttachmentList {...BASE_PROPS} attachments={ATTACHMENTS} onDelete={onDelete} />,
    );

    await user.click(screen.getByRole("button", { name: "Delete contract.pdf" }));
    expect(screen.getByRole("heading", { name: "Delete “contract.pdf”?" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete attachment" }));
    expect(onDelete).toHaveBeenCalledWith("ready");
  });

  it("cancelling the delete dialog calls no handler", async () => {
    const onDelete = vi.fn();
    const { user } = renderWithUser(
      <AttachmentList {...BASE_PROPS} attachments={ATTACHMENTS} onDelete={onDelete} />,
    );

    await user.click(screen.getByRole("button", { name: "Delete contract.pdf" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the delete dialog once the caller removes the deleted attachment", async () => {
    const { user, rerender } = renderWithUser(
      <AttachmentList {...BASE_PROPS} attachments={ATTACHMENTS} onDelete={() => {}} />,
    );
    // Open the dialog, then simulate the caller's own successful delete by
    // dropping the row from `attachments`.
    await user.click(screen.getByRole("button", { name: "Delete contract.pdf" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    rerender(
      <AttachmentList
        {...BASE_PROPS}
        attachments={ATTACHMENTS.filter((attachment) => attachment.id !== "ready")}
        onDelete={() => {}}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the delete dialog open and shows deleteError when the delete fails", async () => {
    const { user, rerender } = renderWithUser(
      <AttachmentList {...BASE_PROPS} attachments={ATTACHMENTS} onDelete={() => {}} />,
    );
    await user.click(screen.getByRole("button", { name: "Delete contract.pdf" }));

    rerender(
      <AttachmentList
        {...BASE_PROPS}
        attachments={ATTACHMENTS}
        onDelete={() => {}}
        deleteError="Couldn't delete this attachment."
      />,
    );

    expect(screen.getByText("Couldn't delete this attachment.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("has no axe violations across every status", async () => {
    const { container } = renderWithUser(
      <AttachmentList
        {...BASE_PROPS}
        attachments={ATTACHMENTS}
        onCancel={() => {}}
        onRetry={() => {}}
        onDownload={() => {}}
        onDelete={() => {}}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });

  it("has no axe violations on the empty state", async () => {
    const { container } = renderWithUser(<AttachmentList {...BASE_PROPS} attachments={[]} />);
    await expectNoAccessibilityViolations(container);
  });
});
