import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  ClearableDemo,
  DueDateDemo,
  NotesDemo,
  PriorityDemo,
  RecurrenceEditScopeDialogDemo,
  RecurrenceEditorDemo,
  StartTimeDemo,
} from "./FormDemos";

describe("FormDemos", () => {
  it("renders and interacts with PriorityDemo", async () => {
    const user = userEvent.setup();
    render(<PriorityDemo orientation="horizontal" />);

    expect(screen.getByText("Priority")).toBeInTheDocument();
    const p1Radio = screen.getByLabelText(/High/i);
    await user.click(p1Radio);
    expect(p1Radio).toBeChecked();
  });

  it("renders and interacts with ClearableDemo", async () => {
    const user = userEvent.setup();
    render(<ClearableDemo />);

    const input = screen.getByLabelText("Search tasks");
    expect(input).toHaveValue("Website refresh");

    const clearBtn = screen.getByRole("button", { name: "Clear" });
    await user.click(clearBtn);
    expect(input).toHaveValue("");
  });

  it("renders and interacts with NotesDemo", async () => {
    const user = userEvent.setup();
    render(<NotesDemo />);

    const textarea = screen.getByLabelText("Notes");
    await user.type(textarea, "Hello world");
    expect(textarea).toHaveValue("Hello world");
  });

  it("renders and interacts with DueDateDemo", async () => {
    const user = userEvent.setup();
    render(<DueDateDemo timeZone="UTC" />);

    const clearBtn = screen.getByRole("button", { name: "Clear date" });
    await user.click(clearBtn);
    expect(screen.getByText("(none)")).toBeInTheDocument();
  });

  it("renders and interacts with StartTimeDemo", async () => {
    const user = userEvent.setup();
    render(<StartTimeDemo />);

    const clearBtn = screen.getByRole("button", { name: "Clear time" });
    await user.click(clearBtn);
    expect(screen.getByText("(none)")).toBeInTheDocument();
  });

  it("renders RecurrenceEditorDemo", () => {
    render(<RecurrenceEditorDemo />);
    expect(screen.getByText("Recurrence Pattern")).toBeInTheDocument();
  });

  it("renders and interacts with RecurrenceEditScopeDialogDemo", async () => {
    const user = userEvent.setup();
    render(<RecurrenceEditScopeDialogDemo />);

    const openButton = screen.getByRole("button", {
      name: "Open Recurrence Edit Scope Dialog",
    });
    await user.click(openButton);

    expect(screen.getByText("Edit Recurring Task")).toBeInTheDocument();

    const seriesRadio = screen.getByLabelText(/All occurrences in series/i);
    await user.click(seriesRadio);

    const applyButton = screen.getByRole("button", { name: "Apply Edit" });
    await user.click(applyButton);

    expect(screen.getByText(/Chosen scope: SERIES/i)).toBeInTheDocument();
  });
});
