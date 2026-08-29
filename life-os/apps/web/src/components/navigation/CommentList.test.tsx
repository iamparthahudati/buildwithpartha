import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { CommentList, type Comment } from "./CommentList";

const NOW = new Date("2026-08-18T12:00:00.000Z");

const COMMENTS: readonly Comment[] = [
  {
    id: "c1",
    authorName: "Ada Lovelace",
    body: "Looks good to me.",
    createdAt: "2026-08-18T10:00:00.000Z",
  },
  {
    id: "c2",
    authorName: "Grace Hopper",
    body: "One nit: the header wraps at 320px.",
    createdAt: "2026-08-18T11:00:00.000Z",
    editedAt: "2026-08-18T11:30:00.000Z",
  },
];

const BASE_PROPS = {
  label: "Comments",
  locale: "en-US",
  timeZone: "UTC",
  emptyTitle: "No comments yet",
  now: NOW,
};

describe("CommentList", () => {
  it("renders a real, labelled list with one item per comment", () => {
    renderWithUser(<CommentList {...BASE_PROPS} comments={COMMENTS} />);
    const list = screen.getByRole("list", { name: "Comments" });
    expect(list.tagName).toBe("UL");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("renders each comment's author, body and relative time", () => {
    renderWithUser(<CommentList {...BASE_PROPS} comments={COMMENTS} />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Looks good to me.")).toBeInTheDocument();
    expect(screen.getByText("2 hours ago")).toBeInTheDocument();
  });

  it("renders untrusted comment content only as text", () => {
    const body = '<img src=x onerror="alert(1)"> [Open](javascript:alert(1))';
    const { container } = renderWithUser(
      <CommentList {...BASE_PROPS} comments={[{ ...COMMENTS[0]!, body }]} />,
    );

    expect(screen.getByText(body)).toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector("a")).not.toBeInTheDocument();
  });

  it("announces an optimistic pending row and withholds mutation controls", () => {
    renderWithUser(
      <CommentList
        {...BASE_PROPS}
        comments={[{ ...COMMENTS[0]!, id: "pending-1", pendingLabel: "Posting…" }]}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Posting…");
    expect(screen.queryByRole("button", { name: /^Edit comment/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete comment/ })).not.toBeInTheDocument();
  });

  it("gives the accessible timestamp label the full absolute date", () => {
    renderWithUser(<CommentList {...BASE_PROPS} comments={COMMENTS} />);
    expect(screen.getByText("2 hours ago")).toHaveAttribute("aria-label", "Aug 18, 2026, 10:00 AM");
  });

  it("shows an (edited) annotation only for a comment with editedAt", () => {
    renderWithUser(<CommentList {...BASE_PROPS} comments={COMMENTS} />);
    expect(screen.getAllByText("(edited)")).toHaveLength(1);
  });

  it("shows an EmptyState when there are no comments", () => {
    renderWithUser(<CommentList {...BASE_PROPS} comments={[]} />);
    expect(screen.getByText("No comments yet")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Comments" })).not.toBeInTheDocument();
  });

  it("shows a loading state with an announced live region instead of the list", () => {
    renderWithUser(<CommentList {...BASE_PROPS} comments={[]} status={{ type: "loading" }} />);
    expect(screen.getByText("Loading Comments…")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Comments" })).not.toBeInTheDocument();
  });

  it("shows an ErrorState with retry when status is error", async () => {
    const onRetry = vi.fn();
    const { user } = renderWithUser(
      <CommentList
        {...BASE_PROPS}
        comments={[]}
        status={{ type: "error", message: "Network error.", onRetry }}
      />,
    );
    expect(screen.getByText("Network error.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders no edit/delete controls unless their handler is given", () => {
    renderWithUser(<CommentList {...BASE_PROPS} comments={COMMENTS} />);
    expect(screen.queryByRole("button", { name: /^Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete/ })).not.toBeInTheDocument();
  });

  it("clicking Edit swaps the row for a pre-filled composer, and Cancel restores it", async () => {
    const { user } = renderWithUser(
      <CommentList {...BASE_PROPS} comments={COMMENTS} onEdit={() => {}} />,
    );

    await user.click(screen.getByRole("button", { name: "Edit comment by Ada Lovelace" }));
    const editField = screen.getByRole("textbox", { name: "Edit comment" });
    expect(editField).toHaveValue("Looks good to me.");
    expect(editField).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("textbox", { name: "Edit comment" })).not.toBeInTheDocument();
    expect(screen.getByText("Looks good to me.")).toBeInTheDocument();
  });

  it("saving an edit calls onEdit with the id and the typed body", async () => {
    const onEdit = vi.fn();
    const { user } = renderWithUser(
      <CommentList {...BASE_PROPS} comments={COMMENTS} onEdit={onEdit} />,
    );

    await user.click(screen.getByRole("button", { name: "Edit comment by Ada Lovelace" }));
    const editField = screen.getByRole("textbox", { name: "Edit comment" });
    await user.clear(editField);
    await user.type(editField, "Actually, one concern.");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onEdit).toHaveBeenCalledWith("c1", "Actually, one concern.");
  });

  it("exits edit mode once editPending returns to false with no editError", async () => {
    const { user, rerender } = renderWithUser(
      <CommentList {...BASE_PROPS} comments={COMMENTS} onEdit={() => {}} />,
    );
    await user.click(screen.getByRole("button", { name: "Edit comment by Ada Lovelace" }));
    expect(screen.getByRole("textbox", { name: "Edit comment" })).toBeInTheDocument();

    // The caller's save request goes in flight...
    rerender(<CommentList {...BASE_PROPS} comments={COMMENTS} onEdit={() => {}} editPending />);
    expect(screen.getByRole("textbox", { name: "Edit comment" })).toBeInTheDocument();

    // ...and finishes without an error, closing edit mode on its own.
    rerender(<CommentList {...BASE_PROPS} comments={COMMENTS} onEdit={() => {}} />);
    expect(screen.queryByRole("textbox", { name: "Edit comment" })).not.toBeInTheDocument();
  });

  it("keeps edit mode open and shows editError when a save fails", async () => {
    const { user, rerender } = renderWithUser(
      <CommentList {...BASE_PROPS} comments={COMMENTS} onEdit={() => {}} />,
    );
    await user.click(screen.getByRole("button", { name: "Edit comment by Ada Lovelace" }));

    rerender(<CommentList {...BASE_PROPS} comments={COMMENTS} onEdit={() => {}} editPending />);
    rerender(
      <CommentList
        {...BASE_PROPS}
        comments={COMMENTS}
        onEdit={() => {}}
        editError="Couldn't save this comment."
      />,
    );

    expect(screen.getByRole("textbox", { name: "Edit comment" })).toBeInTheDocument();
    expect(screen.getByText("Couldn't save this comment.")).toBeInTheDocument();
  });

  it("does not offer delete on a row currently being edited", async () => {
    const { user } = renderWithUser(
      <CommentList {...BASE_PROPS} comments={COMMENTS} onEdit={() => {}} onDelete={() => {}} />,
    );
    await user.click(screen.getByRole("button", { name: "Edit comment by Ada Lovelace" }));
    expect(
      screen.queryByRole("button", { name: "Delete comment by Ada Lovelace" }),
    ).not.toBeInTheDocument();
  });

  it("confirms before deleting a comment", async () => {
    const onDelete = vi.fn();
    const { user } = renderWithUser(
      <CommentList {...BASE_PROPS} comments={COMMENTS} onDelete={onDelete} />,
    );

    await user.click(screen.getByRole("button", { name: "Delete comment by Ada Lovelace" }));
    expect(screen.getByRole("heading", { name: "Delete this comment?" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete comment" }));
    expect(onDelete).toHaveBeenCalledWith("c1");
  });

  it("cancelling the delete dialog calls no handler", async () => {
    const onDelete = vi.fn();
    const { user } = renderWithUser(
      <CommentList {...BASE_PROPS} comments={COMMENTS} onDelete={onDelete} />,
    );

    await user.click(screen.getByRole("button", { name: "Delete comment by Ada Lovelace" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the delete dialog once the caller removes the deleted comment", async () => {
    const { user, rerender } = renderWithUser(
      <CommentList {...BASE_PROPS} comments={COMMENTS} onDelete={() => {}} />,
    );
    await user.click(screen.getByRole("button", { name: "Delete comment by Ada Lovelace" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    rerender(
      <CommentList
        {...BASE_PROPS}
        comments={COMMENTS.filter((comment) => comment.id !== "c1")}
        onDelete={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the delete dialog open and shows deleteError when the delete fails", async () => {
    const { user, rerender } = renderWithUser(
      <CommentList {...BASE_PROPS} comments={COMMENTS} onDelete={() => {}} />,
    );
    await user.click(screen.getByRole("button", { name: "Delete comment by Ada Lovelace" }));

    rerender(
      <CommentList
        {...BASE_PROPS}
        comments={COMMENTS}
        onDelete={() => {}}
        deleteError="Couldn't delete this comment."
      />,
    );
    expect(screen.getByText("Couldn't delete this comment.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("has no axe violations across ready, loading, error and empty", async () => {
    const { container, rerender } = renderWithUser(
      <CommentList {...BASE_PROPS} comments={COMMENTS} onEdit={() => {}} onDelete={() => {}} />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(<CommentList {...BASE_PROPS} comments={[]} status={{ type: "loading" }} />);
    await expectNoAccessibilityViolations(container);

    rerender(
      <CommentList
        {...BASE_PROPS}
        comments={[]}
        status={{ type: "error", message: "Network error." }}
      />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(<CommentList {...BASE_PROPS} comments={[]} />);
    await expectNoAccessibilityViolations(container);
  });
});
