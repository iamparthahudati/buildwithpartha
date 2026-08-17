import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { InlineMessage } from "./InlineMessage";

describe("InlineMessage", () => {
  it("renders its message and stays silent by default", async () => {
    const { container } = renderWithUser(
      <InlineMessage tone="warning">3 attachments failed to upload.</InlineMessage>,
    );

    expect(screen.getByText("3 attachments failed to upload.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("carries a decorative icon without describing it twice", () => {
    const { container } = renderWithUser(
      <InlineMessage tone="success">Name is free.</InlineMessage>,
    );

    const icon = container.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("announces assertively only when explicitly asked to", () => {
    renderWithUser(
      <InlineMessage tone="danger" announce="alert">
        A Label named "Learning" already exists.
      </InlineMessage>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent('A Label named "Learning" already exists.');
  });

  it("announces politely, not assertively, when asked for status", () => {
    renderWithUser(
      <InlineMessage tone="info" announce="status">
        Updated just now.
      </InlineMessage>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not remount, and therefore cannot re-announce, when its own content updates in place", () => {
    const { container, rerender } = renderWithUser(
      <InlineMessage tone="danger" announce="alert">
        Enter a task title.
      </InlineMessage>,
    );
    const firstNode = container.querySelector(".lifeos-inline-message");

    rerender(
      <InlineMessage tone="danger" announce="alert">
        Title too long.
      </InlineMessage>,
    );

    expect(container.querySelector(".lifeos-inline-message")).toBe(firstNode);
    expect(screen.getByRole("alert")).toHaveTextContent("Title too long.");
  });

  it("switches its color per tone, matching Alert's own four-tone contract", () => {
    const { container, rerender } = renderWithUser(
      <InlineMessage tone="info">Updated just now.</InlineMessage>,
    );
    expect(container.firstElementChild).toHaveClass("lifeos-inline-message--info");

    rerender(<InlineMessage tone="danger">Enter a task title.</InlineMessage>);
    expect(container.firstElementChild).toHaveClass("lifeos-inline-message--danger");
  });
});
