import { useState } from "react";

import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Checkbox } from "./Checkbox";
import { RadioGroup } from "./Radio";
import { Switch } from "./Switch";
import { TextInput } from "./TextInput";

describe("Checkbox", () => {
  it("is a real checkbox bound to a real label", async () => {
    const { container } = renderWithUser(<Checkbox label="Include archived projects" />);

    expect(screen.getByRole("checkbox", { name: "Include archived projects" })).toBeVisible();
    await expectNoAccessibilityViolations(container);
  });

  it("toggles by click and by Space", async () => {
    const { user } = renderWithUser(<Checkbox label="Include archived" defaultChecked={false} />);
    const checkbox = screen.getByRole("checkbox");

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.keyboard(" ");
    expect(checkbox).not.toBeChecked();
  });

  it("is toggled by clicking its label text", async () => {
    const { user } = renderWithUser(<Checkbox label="Include archived" />);

    await user.click(screen.getByText("Include archived"));

    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("renders the mixed state as a DOM property, not an attribute", () => {
    renderWithUser(<Checkbox label="Select all" indeterminate />);

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    // The browser maps the DOM property to the accessibility tree itself, so
    // there is no aria-checked attribute to assert on.
    expect(checkbox.indeterminate).toBe(true);
    expect(checkbox).toBePartiallyChecked();
  });

  it("clears the mixed state when it no longer applies", () => {
    const { rerender } = renderWithUser(<Checkbox label="Select all" indeterminate />);
    rerender(<Checkbox label="Select all" indeterminate={false} />);

    expect((screen.getByRole("checkbox") as HTMLInputElement).indeterminate).toBe(false);
  });

  it("links its description and error so both are announced", async () => {
    const { container } = renderWithUser(
      <Checkbox
        label="Include archived"
        description="Archived projects stay hidden by default."
        error="Select at least one filter."
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveAccessibleDescription(
      /Select at least one filter.*Archived projects stay hidden by default/s,
    );
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    await expectNoAccessibilityViolations(container);
  });

  it("does not toggle while disabled", async () => {
    const onChange = vi.fn();
    const { user } = renderWithUser(
      <Checkbox label="Include archived" disabled onChange={onChange} />,
    );

    await user.click(screen.getByRole("checkbox"));

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("RadioGroup", () => {
  const options = [
    { value: "P1", label: "P1 — High" },
    { value: "P2", label: "P2 — Medium", description: "Normal planned importance." },
    { value: "P3", label: "P3 — Low" },
    { value: "P4", label: "P4 — Someday", disabled: true },
  ];

  function Controlled() {
    const [value, setValue] = useState("P2");
    return (
      <RadioGroup
        legend="Priority"
        name="priority"
        options={options}
        value={value}
        onValueChange={setValue}
      />
    );
  }

  it("groups options under a real legend", async () => {
    const { container } = renderWithUser(<Controlled />);

    const group = screen.getByRole("group", { name: "Priority" });
    expect(within(group).getAllByRole("radio")).toHaveLength(4);
    await expectNoAccessibilityViolations(container);
  });

  it("moves between options with arrow keys, using native grouping", async () => {
    const { user } = renderWithUser(<Controlled />);

    // The checked radio is the group's single tab stop.
    await user.tab();
    expect(screen.getByRole("radio", { name: "P2 — Medium" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");

    const p3 = screen.getByRole("radio", { name: "P3 — Low" });
    expect(p3).toHaveFocus();
    expect(p3).toBeChecked();
  });

  it("keeps exactly one option selected", async () => {
    const { user } = renderWithUser(<Controlled />);

    await user.click(screen.getByRole("radio", { name: "P1 — High" }));

    expect(screen.getByRole("radio", { name: "P1 — High" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "P2 — Medium" })).not.toBeChecked();
  });

  it("describes an individual option without describing the whole group", () => {
    renderWithUser(<Controlled />);

    expect(screen.getByRole("radio", { name: "P2 — Medium" })).toHaveAccessibleDescription(
      "Normal planned importance.",
    );
  });

  it("disables only the options marked disabled", () => {
    renderWithUser(<Controlled />);

    expect(screen.getByRole("radio", { name: "P4 — Someday" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "P1 — High" })).toBeEnabled();
  });

  it("reports a group-level error", () => {
    renderWithUser(
      <RadioGroup legend="Priority" name="p" options={options} error="Choose a priority." />,
    );

    expect(screen.getByRole("group")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a priority.");
  });

  it("supports a horizontal layout", () => {
    const { container } = renderWithUser(
      <RadioGroup legend="Priority" name="p" options={options} orientation="horizontal" />,
    );

    expect(container.querySelector("fieldset")).toHaveClass("lifeos-radio-group--horizontal");
  });
});

describe("Switch", () => {
  it("is announced as a switch, not a checkbox", async () => {
    const { container } = renderWithUser(<Switch label="Email reminders" />);

    expect(screen.getByRole("switch", { name: "Email reminders" })).toBeVisible();
    await expectNoAccessibilityViolations(container);
  });

  it("toggles by keyboard", async () => {
    const { user } = renderWithUser(<Switch label="Email reminders" defaultChecked={false} />);

    await user.tab();
    await user.keyboard(" ");

    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("refuses a second toggle while a change is being saved", async () => {
    const onChange = vi.fn();
    const { user } = renderWithUser(
      <Switch label="Email reminders" saving savingLabel="Saving" onChange={onChange} />,
    );

    await user.click(screen.getByRole("switch"));

    // A second toggle would be applied on top of an unconfirmed first.
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-busy", "true");
  });

  it("announces that it is saving", () => {
    renderWithUser(<Switch label="Email reminders" saving savingLabel="Saving preference" />);

    expect(screen.getByText("Saving preference")).toBeInTheDocument();
  });
});

describe("TextInput", () => {
  it("binds a real label to the field", async () => {
    const { container } = renderWithUser(<TextInput label="Project name" />);

    expect(screen.getByLabelText("Project name")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("keeps the label available when it is visually hidden", async () => {
    const { container } = renderWithUser(<TextInput label="Search tasks" labelHidden />);

    // A placeholder would vanish as soon as the user typed; the label does not.
    expect(screen.getByLabelText("Search tasks")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("announces the error before the hint", () => {
    renderWithUser(
      <TextInput
        label="Project name"
        description="Shown on every board."
        error="Enter a project name."
      />,
    );

    const field = screen.getByLabelText("Project name");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(/Enter a project name.*Shown on every board/s);
  });

  it("shows the clear action only when there is something to clear", async () => {
    const onClear = vi.fn();
    const { user, rerender } = renderWithUser(
      <TextInput label="Search" value="" onChange={() => {}} onClear={onClear} />,
    );

    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();

    rerender(<TextInput label="Search" value="review" onChange={() => {}} onClear={onClear} />);
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("keeps the clear button out of the tab order", () => {
    renderWithUser(
      <TextInput label="Search" value="review" onChange={() => {}} onClear={() => {}} />,
    );

    expect(screen.getByRole("button", { name: "Clear" })).toHaveAttribute("tabindex", "-1");
  });

  it("hides the clear action when the field cannot be edited", () => {
    const { rerender } = renderWithUser(
      <TextInput label="Search" value="review" readOnly onClear={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();

    rerender(<TextInput label="Search" value="review" disabled onClear={() => {}} />);
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("keeps affixes out of the accessible name", () => {
    renderWithUser(<TextInput label="Estimate" prefix="~" suffix="hours" />);

    expect(screen.getByLabelText("Estimate")).toBeInTheDocument();
  });

  it("passes through mobile keyboard hints and password-manager attributes", () => {
    renderWithUser(
      <TextInput
        label="Email address"
        type="email"
        inputMode="email"
        autoComplete="email"
        enterKeyHint="next"
      />,
    );

    const field = screen.getByLabelText("Email address");
    expect(field).toHaveAttribute("type", "email");
    expect(field).toHaveAttribute("inputmode", "email");
    expect(field).toHaveAttribute("autocomplete", "email");
    expect(field).toHaveAttribute("enterkeyhint", "next");
  });

  it("reports success politely and never alongside an error", () => {
    const { rerender } = renderWithUser(<TextInput label="Project name" success="Name is free." />);
    expect(screen.getByRole("status")).toHaveTextContent("Name is free.");

    rerender(<TextInput label="Project name" success="Name is free." error="Already taken." />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Already taken.");
  });
});
