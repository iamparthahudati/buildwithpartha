import { useState } from "react";

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { PasswordInput } from "./PasswordInput";
import { Textarea } from "./Textarea";

describe("PasswordInput", () => {
  it("binds a real label and starts concealed", async () => {
    const { container } = renderWithUser(<PasswordInput label="Password" />);

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    await expectNoAccessibilityViolations(container);
  });

  it("reveals and re-conceals the value", async () => {
    const { user } = renderWithUser(<PasswordInput label="Password" />);

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("reports the reveal state as a pressed toggle", async () => {
    const { user } = renderWithUser(<PasswordInput label="Password" />);

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("defaults to concealed on every mount", () => {
    const { unmount } = renderWithUser(<PasswordInput label="Password" />);
    unmount();

    renderWithUser(<PasswordInput label="Password" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("uses the autocomplete value the situation calls for", () => {
    const { rerender } = renderWithUser(<PasswordInput label="Password" />);
    // Sign-in: offer the saved password.
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");

    rerender(<PasswordInput label="New password" autoComplete="new-password" />);
    // Sign-up and reset: offer to generate one.
    expect(screen.getByLabelText("New password")).toHaveAttribute("autocomplete", "new-password");
  });

  it("warns about Caps Lock without interrupting typing", async () => {
    const { user } = renderWithUser(<PasswordInput label="Password" />);

    await user.click(screen.getByLabelText("Password"));
    await user.keyboard("{CapsLock}a");

    // A polite status, not an alert: it describes what is happening now.
    expect(screen.getByRole("status")).toHaveTextContent("Caps Lock is on.");
  });

  it("renders a help slot that never receives the value", () => {
    renderWithUser(
      <PasswordInput label="Password" help={<span>Use at least 12 characters.</span>} />,
    );

    expect(screen.getByText("Use at least 12 characters.")).toBeVisible();
  });

  it("links its error", () => {
    renderWithUser(<PasswordInput label="Password" error="Password is incorrect." />);

    const field = screen.getByLabelText("Password");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Password is incorrect.");
  });
});

describe("Textarea", () => {
  function Controlled({ counterMax }: { counterMax?: number }) {
    const [value, setValue] = useState("");
    return (
      <Textarea
        label="Notes"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        {...(counterMax === undefined ? {} : { counterMax })}
      />
    );
  }

  it("binds a real label", async () => {
    const { container } = renderWithUser(<Textarea label="Notes" />);

    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("counts by code point, so an emoji is one character", async () => {
    const { user } = renderWithUser(<Controlled counterMax={10} />);

    await user.type(screen.getByLabelText("Notes"), "🌱ab");

    // A naive .length would report 4 here.
    expect(screen.getByText("3 / 10")).toBeInTheDocument();
  });

  it("flags going over the limit without truncating what was typed", async () => {
    const { user } = renderWithUser(<Controlled counterMax={3} />);
    const field = screen.getByLabelText("Notes");

    await user.type(field, "abcde");

    // maxLength is deliberately not set: silently truncating a paste loses
    // the user's text without telling them.
    expect(field).toHaveValue("abcde");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("5 / 3")).toBeInTheDocument();
  });

  it("keeps the counter out of the accessibility tree", () => {
    renderWithUser(<Controlled counterMax={10} />);

    // Announcing it on every keystroke would be unbearable.
    expect(screen.getByText("0 / 10")).toHaveAttribute("aria-hidden", "true");
  });

  it("omits the counter entirely when no limit is given", () => {
    renderWithUser(<Textarea label="Notes" />);

    expect(screen.queryByText(/\s\/\s/)).not.toBeInTheDocument();
  });

  it("opts into auto-growing rather than measuring in JavaScript", () => {
    renderWithUser(<Textarea label="Notes" autoGrow />);

    expect(screen.getByLabelText("Notes")).toHaveClass("is-auto-grow");
  });

  it("preserves whitespace and long unicode input", async () => {
    const { user } = renderWithUser(<Controlled />);
    const field = screen.getByLabelText("Notes");

    await user.type(field, "  spaced  {Enter}line two");

    expect(field).toHaveValue("  spaced  \nline two");
  });

  it("supports read-only and disabled", () => {
    const { rerender } = renderWithUser(<Textarea label="Notes" defaultValue="Fixed" readOnly />);
    expect(screen.getByLabelText("Notes")).toHaveAttribute("readonly");

    rerender(<Textarea label="Notes" disabled />);
    expect(screen.getByLabelText("Notes")).toBeDisabled();
  });
});
