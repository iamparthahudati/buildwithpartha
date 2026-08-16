import { useState } from "react";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { DateInput } from "./DateInput";
import { NumberInput } from "./NumberInput";
import { Select } from "./Select";
import { TimeInput } from "./TimeInput";

const STATUS_OPTIONS = [
  { value: "TO_DO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "DONE", label: "Done", disabled: true },
];

describe("Select", () => {
  it("is a real select bound to a real label", async () => {
    const { container } = renderWithUser(<Select label="Status" options={STATUS_OPTIONS} />);

    expect(screen.getByRole("combobox", { name: "Status" })).toBeVisible();
    await expectNoAccessibilityViolations(container);
  });

  it("reports the stored value rather than the label", async () => {
    const onChange = vi.fn();
    const { user } = renderWithUser(
      <Select label="Status" options={STATUS_OPTIONS} defaultValue="TO_DO" onChange={onChange} />,
    );

    await user.selectOptions(screen.getByRole("combobox"), "IN_PROGRESS");

    expect(screen.getByRole("combobox")).toHaveValue("IN_PROGRESS");
    expect(onChange).toHaveBeenCalled();
  });

  it("keeps the placeholder selectable on an optional field", () => {
    renderWithUser(
      <Select label="Project" options={STATUS_OPTIONS} placeholder="No project" defaultValue="" />,
    );

    // An optional field must let the user take their answer back.
    expect(screen.getByRole("option", { name: "No project" })).toBeEnabled();
  });

  it("stops the placeholder being chosen again on a required field", () => {
    renderWithUser(
      <Select label="Status" options={STATUS_OPTIONS} placeholder="Choose a status" required />,
    );

    expect(screen.getByRole("option", { name: "Choose a status" })).toBeDisabled();
  });

  it("disables only the options marked disabled", () => {
    renderWithUser(<Select label="Status" options={STATUS_OPTIONS} />);

    expect(screen.getByRole("option", { name: "Done" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Blocked" })).toBeEnabled();
  });

  it("announces the error before the hint", () => {
    renderWithUser(
      <Select
        label="Status"
        options={STATUS_OPTIONS}
        description="Shown on every board."
        error="Choose a status."
      />,
    );

    const select = screen.getByRole("combobox");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAccessibleDescription(/Choose a status.*Shown on every board/s);
  });
});

describe("DateInput", () => {
  function DueDate({ initial = "" }: { initial?: string }) {
    const [value, setValue] = useState(initial);

    return (
      <DateInput
        label="Due date (optional)"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onClear={() => setValue("")}
      />
    );
  }

  it("binds a real label to the field", async () => {
    const { container } = renderWithUser(<DateInput label="Due date (optional)" />);

    expect(screen.getByLabelText("Due date (optional)")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("carries the calendar date through untouched", async () => {
    const { user } = renderWithUser(<DueDate />);
    const field = screen.getByLabelText("Due date (optional)");

    await user.type(field, "2026-08-17");

    // The exact string the API stores: no instant, no zone, no shifted day.
    expect(field).toHaveValue("2026-08-17");
  });

  it("passes its bounds to the native picker", () => {
    renderWithUser(<DateInput label="Deadline" min="2026-08-17" max="2026-12-31" />);

    const field = screen.getByLabelText("Deadline");
    expect(field).toHaveAttribute("min", "2026-08-17");
    expect(field).toHaveAttribute("max", "2026-12-31");
  });

  it("offers the clear action only when there is a date to clear", async () => {
    const { user } = renderWithUser(<DueDate initial="2026-08-17" />);

    await user.click(screen.getByRole("button", { name: "Clear date" }));

    expect(screen.getByLabelText("Due date (optional)")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Clear date" })).not.toBeInTheDocument();
  });

  it("keeps the clear action out of the tab order", () => {
    renderWithUser(
      <DateInput label="Due date" value="2026-08-17" onChange={() => {}} onClear={() => {}} />,
    );

    expect(screen.getByRole("button", { name: "Clear date" })).toHaveAttribute("tabindex", "-1");
  });

  it("hides the clear action when the field cannot be edited", () => {
    const { rerender } = renderWithUser(
      <DateInput label="Due date" value="2026-08-17" disabled onClear={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: "Clear date" })).not.toBeInTheDocument();

    rerender(<DateInput label="Due date" value="2026-08-17" readOnly onClear={() => {}} />);
    expect(screen.queryByRole("button", { name: "Clear date" })).not.toBeInTheDocument();
  });

  it("reports a validation error against the field", () => {
    renderWithUser(
      <DateInput label="Deadline" error="Choose a deadline on or after 17 Aug 2026." />,
    );

    expect(screen.getByLabelText("Deadline")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a deadline on or after 17 Aug 2026.",
    );
  });
});

describe("TimeInput", () => {
  it("binds a real label and holds a canonical 24-hour value", async () => {
    const { container } = renderWithUser(<TimeInput label="Start time" defaultValue="09:30" />);

    expect(screen.getByLabelText("Start time")).toHaveValue("09:30");
    await expectNoAccessibilityViolations(container);
  });

  it("steps in five minutes by default, and by whatever a caller needs", () => {
    const { rerender } = renderWithUser(<TimeInput label="Start time" />);
    expect(screen.getByLabelText("Start time")).toHaveAttribute("step", "300");

    rerender(<TimeInput label="Start time" step={60} />);
    expect(screen.getByLabelText("Start time")).toHaveAttribute("step", "60");
  });

  it("clears the time on request", async () => {
    const onClear = vi.fn();
    const { user } = renderWithUser(
      <TimeInput label="Start time" value="09:30" onChange={() => {}} onClear={onClear} />,
    );

    await user.click(screen.getByRole("button", { name: "Clear time" }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("reports a validation error against the field", () => {
    renderWithUser(<TimeInput label="End time" error="Choose an end time after the start time." />);

    expect(screen.getByLabelText("End time")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Choose an end time after the start time.");
  });
});

describe("NumberInput", () => {
  it("binds a real label to the field", async () => {
    const { container } = renderWithUser(<NumberInput label="Estimate (optional)" />);

    expect(screen.getByLabelText("Estimate (optional)")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("announces its unit instead of only showing it", () => {
    renderWithUser(<NumberInput label="Estimate (optional)" unit="minutes" />);

    // A number read aloud without its unit means nothing.
    expect(screen.getByLabelText("Estimate (optional)")).toHaveAccessibleDescription("minutes");
  });

  it("announces the error, the hint and the unit together", () => {
    renderWithUser(
      <NumberInput
        label="Estimate"
        unit="minutes"
        description="Your expected effort. You can update it later."
        error="Enter a whole number of minutes."
      />,
    );

    expect(screen.getByLabelText("Estimate")).toHaveAccessibleDescription(
      /Enter a whole number of minutes.*You can update it later.*minutes/s,
    );
  });

  it("passes its bounds and step to the native control", () => {
    renderWithUser(<NumberInput label="Estimate" min={0} max={480} step={15} />);

    const field = screen.getByLabelText("Estimate");
    expect(field).toHaveAttribute("min", "0");
    expect(field).toHaveAttribute("max", "480");
    expect(field).toHaveAttribute("step", "15");
  });

  it("asks for the keypad that matches its step", () => {
    const { rerender } = renderWithUser(<NumberInput label="Estimate" step={15} />);
    expect(screen.getByLabelText("Estimate")).toHaveAttribute("inputmode", "numeric");

    rerender(<NumberInput label="Estimate" step={0.5} />);
    expect(screen.getByLabelText("Estimate")).toHaveAttribute("inputmode", "decimal");
  });

  it("refuses to change its value when the page is scrolled over it", () => {
    renderWithUser(<NumberInput label="Estimate" defaultValue={60} />);
    const field = screen.getByLabelText("Estimate");

    field.focus();
    const overFocusedField = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    });
    field.dispatchEvent(overFocusedField);

    expect(overFocusedField.defaultPrevented).toBe(true);
  });

  it("leaves scrolling alone when the field is not being edited", () => {
    renderWithUser(<NumberInput label="Estimate" defaultValue={60} />);
    const field = screen.getByLabelText("Estimate");

    const overIdleField = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    });
    field.dispatchEvent(overIdleField);

    // An unfocused number field never changes on wheel, so the page must scroll.
    expect(overIdleField.defaultPrevented).toBe(false);
  });

  it("exposes the underlying input through a forwarded ref", () => {
    function Focused() {
      const [element, setElement] = useState<HTMLInputElement | null>(null);
      return (
        <>
          <NumberInput label="Estimate" ref={setElement} />
          <span>{element === null ? "no element" : element.tagName}</span>
        </>
      );
    }

    renderWithUser(<Focused />);

    expect(screen.getByText("INPUT")).toBeInTheDocument();
  });
});
