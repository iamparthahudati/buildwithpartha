import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { CommentComposer } from "./CommentComposer";

describe("CommentComposer", () => {
  it("renders a real, labelled textarea", () => {
    renderWithUser(<CommentComposer value="" onChange={() => {}} onSubmit={() => {}} />);
    expect(screen.getByRole("textbox", { name: "Add a comment" })).toBeInTheDocument();
  });

  it("disables submit until there is non-whitespace content", () => {
    const { rerender } = renderWithUser(
      <CommentComposer value="" onChange={() => {}} onSubmit={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Add comment" })).toBeDisabled();

    rerender(<CommentComposer value="   " onChange={() => {}} onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: "Add comment" })).toBeDisabled();

    rerender(<CommentComposer value="Looks good" onChange={() => {}} onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: "Add comment" })).toBeEnabled();
  });

  it("clicking submit calls onSubmit", async () => {
    const onSubmit = vi.fn();
    const { user } = renderWithUser(
      <CommentComposer value="Looks good" onChange={() => {}} onSubmit={onSubmit} />,
    );
    await user.click(screen.getByRole("button", { name: "Add comment" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("plain Enter inserts a newline rather than submitting", async () => {
    const onSubmit = vi.fn();
    const onChange = vi.fn();
    const { user } = renderWithUser(
      <CommentComposer value="Line one" onChange={onChange} onSubmit={onSubmit} />,
    );
    await user.type(screen.getByRole("textbox", { name: "Add a comment" }), "{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Ctrl+Enter submits", async () => {
    const onSubmit = vi.fn();
    const { user } = renderWithUser(
      <CommentComposer value="Looks good" onChange={() => {}} onSubmit={onSubmit} />,
    );
    screen.getByRole("textbox", { name: "Add a comment" }).focus();
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+Enter does nothing while an IME composition is in progress", () => {
    const onSubmit = vi.fn();
    renderWithUser(<CommentComposer value="Looks good" onChange={() => {}} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Add a comment" }), {
      key: "Enter",
      ctrlKey: true,
      isComposing: true,
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Ctrl+Enter does nothing while content is empty", async () => {
    const onSubmit = vi.fn();
    const { user } = renderWithUser(
      <CommentComposer value="" onChange={() => {}} onSubmit={onSubmit} />,
    );
    screen.getByRole("textbox", { name: "Add a comment" }).focus();
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows pending as a busy submit button and disables the field", () => {
    renderWithUser(
      <CommentComposer value="Looks good" onChange={() => {}} onSubmit={() => {}} pending />,
    );
    expect(screen.getByRole("textbox", { name: "Add a comment" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add comment" })).toBeDisabled();
  });

  it("shows an error as an alert without losing the typed value", () => {
    renderWithUser(
      <CommentComposer
        value="Looks good"
        onChange={() => {}}
        onSubmit={() => {}}
        error="Couldn't post this comment."
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't post this comment.");
    expect(screen.getByRole("textbox", { name: "Add a comment" })).toHaveValue("Looks good");
  });

  it("renders no Cancel button unless onCancel is given", () => {
    const { rerender } = renderWithUser(
      <CommentComposer value="" onChange={() => {}} onSubmit={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();

    rerender(
      <CommentComposer value="" onChange={() => {}} onSubmit={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("supports a custom label and submit label for reuse as an inline editor", () => {
    renderWithUser(
      <CommentComposer
        label="Edit comment"
        submitLabel="Save"
        value="Updated text"
        onChange={() => {}}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Edit comment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("has no axe violations, plain and with an error", async () => {
    const { container, rerender } = renderWithUser(
      <CommentComposer value="Looks good" onChange={() => {}} onSubmit={() => {}} />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(
      <CommentComposer
        value="Looks good"
        onChange={() => {}}
        onSubmit={() => {}}
        error="Couldn't post this comment."
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
