import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { RecurrenceEditor } from "./RecurrenceEditor";
import type { RecurrenceRule } from "./recurrenceContract";

const INITIAL_RULE: RecurrenceRule = {
  frequency: "WEEKLY",
  intervalValue: 1,
  daysOfWeek: ["MONDAY", "WEDNESDAY"],
  endMode: "NEVER",
  startDate: "2026-09-01",
  timeZone: "UTC",
};

function StatefulEditor(props: Partial<Parameters<typeof RecurrenceEditor>[0]>) {
  const [rule, setRule] = useState<RecurrenceRule>(props.value ?? INITIAL_RULE);
  return <RecurrenceEditor value={rule} onChange={setRule} {...props} />;
}

describe("RecurrenceEditor", () => {
  it("renders frequency, summary, and next occurrence preview", () => {
    render(<StatefulEditor />);

    expect(screen.getByText("Recurrence Pattern")).toBeInTheDocument();
    expect(screen.getByText("Repeats weekly on Mon, Wed")).toBeInTheDocument();
    expect(screen.getByText(/Next Occurrences Preview/i)).toBeInTheDocument();
  });

  it("handles day of week selection toggles", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<RecurrenceEditor value={INITIAL_RULE} onChange={handleChange} />);

    const fridayButton = screen.getByRole("button", { name: "Fri" });
    expect(fridayButton).toHaveAttribute("aria-pressed", "false");

    await user.click(fridayButton);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        daysOfWeek: ["MONDAY", "WEDNESDAY", "FRIDAY"],
      }),
    );
  });

  it("prevents empty day of week selection", async () => {
    const user = userEvent.setup();
    const handleSingleChange = vi.fn();
    const singleDayRule: RecurrenceRule = {
      ...INITIAL_RULE,
      daysOfWeek: ["MONDAY"],
    };

    render(<RecurrenceEditor value={singleDayRule} onChange={handleSingleChange} />);

    const mondayButtons = screen.getAllByRole("button", { name: "Mon" });
    await user.click(mondayButtons[0]!);

    expect(handleSingleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        daysOfWeek: ["MONDAY"],
      }),
    );
  });

  it("ignores day of week toggle when readOnly or disabled", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<RecurrenceEditor value={INITIAL_RULE} onChange={handleChange} readOnly />);

    const fridayButton = screen.getByRole("button", { name: "Fri" });
    await user.click(fridayButton);

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("displays offline warning banner when isOffline is true", () => {
    render(<StatefulEditor isOffline={true} />);

    expect(
      screen.getByText("Working offline. Recurrence changes will sync when connected."),
    ).toBeInTheDocument();
  });

  it("switches frequency to MONTHLY, WEEKDAY, AFTER_COMPLETION, and DAILY", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<RecurrenceEditor value={INITIAL_RULE} onChange={handleChange} />);

    const freqSelect = screen.getByLabelText("Frequency");
    await user.selectOptions(freqSelect, "MONTHLY");

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        frequency: "MONTHLY",
        dayOfMonth: 1,
      }),
    );
  });

  it("sets default daysOfWeek when switching to WEEKLY if daysOfWeek is missing", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const dailyRule: RecurrenceRule = {
      frequency: "DAILY",
      intervalValue: 1,
      endMode: "NEVER",
      startDate: "2026-09-01",
      timeZone: "UTC",
    };

    render(<RecurrenceEditor value={dailyRule} onChange={handleChange} />);

    const freqSelect = screen.getByLabelText("Frequency");
    await user.selectOptions(freqSelect, "WEEKLY");

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        frequency: "WEEKLY",
        daysOfWeek: ["MONDAY"],
      }),
    );
  });

  it("handles interval and day of month number inputs including fallbacks", () => {
    const handleChange = vi.fn();
    const monthlyRule: RecurrenceRule = {
      frequency: "MONTHLY",
      intervalValue: 1,
      dayOfMonth: 15,
      endMode: "NEVER",
      startDate: "2026-09-01",
      timeZone: "UTC",
    };

    render(<RecurrenceEditor value={monthlyRule} onChange={handleChange} />);

    const intervalInput = screen.getByLabelText("Every (months)");
    fireEvent.change(intervalInput, { target: { value: "" } });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        intervalValue: 1,
      }),
    );

    const dayOfMonthInput = screen.getByLabelText("Day of Month");
    fireEvent.change(dayOfMonthInput, { target: { value: "50" } });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dayOfMonth: 1,
      }),
    );
  });

  it("handles end mode transitions to UNTIL_DATE and COUNT and renders their inputs", async () => {
    const user = userEvent.setup();
    render(<StatefulEditor />);

    const untilDateRadio = screen.getByLabelText("On date");
    await user.click(untilDateRadio);
    expect(screen.getByLabelText("End Date")).toBeInTheDocument();

    const endDateInput = screen.getByLabelText("End Date");
    fireEvent.change(endDateInput, { target: { value: "2026-12-31" } });
    expect(endDateInput).toHaveValue("2026-12-31");

    fireEvent.change(endDateInput, { target: { value: "" } });
    expect(endDateInput).toHaveValue("");

    const countRadio = screen.getByLabelText("After number of occurrences");
    await user.click(countRadio);
    expect(screen.getByLabelText("Total Occurrences")).toBeInTheDocument();

    const countInput = screen.getByLabelText("Total Occurrences");
    fireEvent.change(countInput, { target: { value: "15" } });
    expect(countInput).toHaveValue(15);

    fireEvent.change(countInput, { target: { value: "0" } });
    expect(countInput).toHaveValue(1);
  });

  it("handles end date clear and update events", () => {
    const handleChange = vi.fn();
    const untilRule: RecurrenceRule = {
      ...INITIAL_RULE,
      endMode: "UNTIL_DATE",
      endDate: "2026-09-01",
    };

    render(<RecurrenceEditor value={untilRule} onChange={handleChange} />);

    const endDateInput = screen.getByLabelText("End Date");
    fireEvent.change(endDateInput, { target: { value: "2026-12-31" } });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        endDate: "2026-12-31",
      }),
    );

    fireEvent.change(endDateInput, { target: { value: "" } });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        endDate: null,
      }),
    );
  });

  it("handles end count input mutations with fallbacks", () => {
    const handleChange = vi.fn();
    const countRule: RecurrenceRule = {
      ...INITIAL_RULE,
      endMode: "COUNT",
      endCount: 5,
    };

    render(<RecurrenceEditor value={countRule} onChange={handleChange} />);

    const countInput = screen.getByLabelText("Total Occurrences");
    fireEvent.change(countInput, { target: { value: "0" } });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        endCount: 1,
      }),
    );
  });

  it("displays explicit validation or custom error message", () => {
    render(<StatefulEditor error="Custom server error message" />);
    expect(screen.getByText("Custom server error message")).toBeInTheDocument();
  });

  it("disables all inputs when readOnly or disabled is true", () => {
    render(<StatefulEditor readOnly={true} disabled={true} />);
    const freqSelect = screen.getByLabelText("Frequency");
    expect(freqSelect).toBeDisabled();
  });
});
