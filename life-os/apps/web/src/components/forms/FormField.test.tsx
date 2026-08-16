import { useState } from "react";

import { screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Checkbox, TextInput } from "@components/ui";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { FormErrorSummary } from "./FormErrorSummary";
import { FormField } from "./FormField";
import { FormFieldGroup } from "./FormFieldGroup";
import { useFormFieldRegistration } from "./formFieldRegistry";

beforeAll(() => {
  // jsdom has no layout engine and does not implement scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});

describe("FormField", () => {
  it("generates an id and binds a real label to the composed control", async () => {
    const { container } = renderWithUser(
      <FormField name="title" label="Task title">
        {(field) => <TextInput {...field} />}
      </FormField>,
    );

    expect(screen.getByLabelText("Task title")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("marks an optional field instead of marking every required one", () => {
    const { rerender } = renderWithUser(
      <FormField name="title" label="Task title">
        {(field) => <TextInput {...field} />}
      </FormField>,
    );
    expect(screen.getByLabelText("Task title")).toBeInTheDocument();

    rerender(
      <FormField name="dueDate" label="Due date" required={false}>
        {(field) => <TextInput {...field} />}
      </FormField>,
    );
    expect(screen.getByLabelText("Due date (optional)")).toBeInTheDocument();
  });

  it("hands back whether the field is required without applying it itself", () => {
    let seenRequired: boolean | undefined;
    renderWithUser(
      <FormField name="dueDate" label="Due date" required={false}>
        {(field) => {
          seenRequired = field.required;
          return <TextInput {...field} />;
        }}
      </FormField>,
    );

    // FormField hands the flag back rather than setting the native `required`
    // attribute itself: it means something different on every atom shape.
    expect(seenRequired).toBe(false);
  });

  it("passes description and error through to the composed control", () => {
    renderWithUser(
      <FormField
        name="title"
        label="Task title"
        description="Shown on every board."
        error="Enter a task title."
      >
        {(field) => <TextInput {...field} />}
      </FormField>,
    );

    const field = screen.getByLabelText("Task title");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(/Enter a task title.*Shown on every board/s);
  });

  it("composes a control whose own accessible pattern is not TextInput's", async () => {
    const { container } = renderWithUser(
      <FormField name="archived" label="Include archived projects">
        {(field) => <Checkbox {...field} />}
      </FormField>,
    );

    expect(screen.getByRole("checkbox", { name: "Include archived projects" })).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("works with no FormFieldGroup present", () => {
    // A lone field — a settings toggle, a filter — must not require a form
    // wrapper it will never need.
    expect(() =>
      renderWithUser(
        <FormField name="title" label="Task title" error="Enter a task title.">
          {(field) => <TextInput {...field} />}
        </FormField>,
      ),
    ).not.toThrow();
  });
});

describe("FormFieldGroup and FormErrorSummary", () => {
  it("renders nothing while there is no error to summarize", () => {
    renderWithUser(
      <FormFieldGroup>
        <FormErrorSummary />
        <FormField name="title" label="Task title">
          {(field) => <TextInput {...field} />}
        </FormField>
      </FormFieldGroup>,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("lists a registered field's error and moves focus to it on activation", async () => {
    const { user, container } = renderWithUser(
      <FormFieldGroup>
        <FormErrorSummary />
        <FormField name="title" label="Task title" error="Enter a task title.">
          {(field) => <TextInput {...field} />}
        </FormField>
        <FormField name="estimateMinutes" label="Estimate" error="Enter a whole number.">
          {(field) => <TextInput {...field} />}
        </FormField>
      </FormFieldGroup>,
    );

    const summary = screen.getByRole("alert", { name: "Fix the following before continuing" });
    expect(summary).toHaveTextContent("Enter a task title.");
    expect(summary).toHaveTextContent("Enter a whole number.");
    await expectNoAccessibilityViolations(container);

    await user.click(screen.getByRole("button", { name: "Enter a task title." }));

    expect(screen.getByLabelText("Task title")).toHaveFocus();
  });

  it("removes a field from the summary the moment its error clears", async () => {
    function Form() {
      const [error, setError] = useState<string | undefined>("Enter a task title.");
      return (
        <FormFieldGroup>
          <FormErrorSummary />
          <FormField name="title" label="Task title" {...(error ? { error } : {})}>
            {(field) => <TextInput {...field} />}
          </FormField>
          <button type="button" onClick={() => setError(undefined)}>
            Fix it
          </button>
        </FormFieldGroup>
      );
    }

    const { user } = renderWithUser(<Form />);
    expect(
      screen.getByRole("alert", { name: "Fix the following before continuing" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fix it" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("lists errors in the order the fields appear, not registration timing", () => {
    renderWithUser(
      <FormFieldGroup>
        <FormErrorSummary />
        <FormField name="title" label="Task title" error="Enter a task title.">
          {(field) => <TextInput {...field} />}
        </FormField>
        <FormField name="dueDate" label="Due date" error="Choose a date on or after today.">
          {(field) => <TextInput {...field} />}
        </FormField>
      </FormFieldGroup>,
    );

    const links = screen.getAllByRole("button");
    expect(links.map((link) => link.textContent)).toEqual([
      "Enter a task title.",
      "Choose a date on or after today.",
    ]);
  });

  it("accepts a manually registered field for a control FormField does not compose", () => {
    // Stands in for RadioGroup, which uses `legend` rather than `label` and
    // does not accept an external id, so it registers itself directly instead
    // of going through FormField.
    function ManualField() {
      useFormFieldRegistration("priority", "priority-group", "Priority", "Choose a priority.");
      return <div id="priority-group">stand-in for RadioGroup</div>;
    }

    renderWithUser(
      <FormFieldGroup>
        <FormErrorSummary />
        <ManualField />
      </FormFieldGroup>,
    );

    expect(screen.getByRole("button", { name: "Choose a priority." })).toBeInTheDocument();
  });

  it("exposes a forwarded ref so a failed submit can move focus to the summary", () => {
    const summaryRef: { current: HTMLDivElement | null } = { current: null };

    renderWithUser(
      <FormFieldGroup>
        <FormErrorSummary
          ref={(node) => {
            summaryRef.current = node;
          }}
        />
        <FormField name="title" label="Task title" error="Enter a task title.">
          {(field) => <TextInput {...field} />}
        </FormField>
      </FormFieldGroup>,
    );

    summaryRef.current?.focus();

    expect(
      screen.getByRole("alert", { name: "Fix the following before continuing" }),
    ).toHaveFocus();
  });
});
