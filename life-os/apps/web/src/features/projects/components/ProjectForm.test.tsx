import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectForm, type ProjectFormData } from "./ProjectForm";

describe("ProjectForm", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  };

  it("renders create form with default values", () => {
    render(<ProjectForm {...defaultProps} />);

    expect(screen.getByRole("heading", { name: "Create project" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Project name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/i)).toHaveValue("ACTIVE");
    expect(screen.getByLabelText(/Priority/i)).toHaveValue("P3");
    expect(screen.getByRole("button", { name: "Show advanced options" })).toBeInTheDocument();
  });

  it("expands advanced options when toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<ProjectForm {...defaultProps} />);

    expect(screen.queryByLabelText(/Start date/i)).not.toBeInTheDocument();

    const toggleBtn = screen.getByRole("button", { name: "Show advanced options" });
    await user.click(toggleBtn);

    expect(screen.getByRole("button", { name: "Hide advanced options" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Deadline date/i)).toBeInTheDocument();
  });

  it("pre-populates initial values in edit mode and automatically shows advanced options", () => {
    const initialValues: ProjectFormData = {
      id: "proj-1",
      name: "Existing Project",
      description: "Sample description",
      status: "PLANNED",
      priority: "P1",
      health: "ON_TRACK",
      color: "green",
      icon: "target",
      startDate: "2026-09-01",
      deadlineDate: "2026-10-01",
      estimatedMinutes: 120,
      labels: ["Frontend"],
      version: 2,
    };

    render(<ProjectForm {...defaultProps} mode="edit" initialValues={initialValues} />);

    expect(screen.getByRole("heading", { name: "Edit project" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Project name/i)).toHaveValue("Existing Project");
    expect(screen.getByLabelText(/Description/i)).toHaveValue("Sample description");
    expect(screen.getByLabelText(/Status/i)).toHaveValue("PLANNED");
    expect(screen.getByLabelText(/Priority/i)).toHaveValue("P1");

    expect(screen.getByLabelText(/Start date/i)).toHaveValue("2026-09-01");
    expect(screen.getByLabelText(/Deadline date/i)).toHaveValue("2026-10-01");
  });

  it("validates required project name on submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProjectForm {...defaultProps} onSubmit={onSubmit} />);

    const submitBtn = screen.getByRole("button", { name: "Create project" });
    await user.click(submitBtn);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText("Project name is required.").length).toBeGreaterThan(0);
  });

  it("validates deadline date is not before start date", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProjectForm {...defaultProps} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Project name/i), "Test Project");
    await user.click(screen.getByRole("button", { name: "Show advanced options" }));

    await user.type(screen.getByLabelText(/Start date/i), "2026-09-15");
    await user.type(screen.getByLabelText(/Deadline date/i), "2026-09-01");

    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getAllByText("Deadline date cannot be before start date.").length,
    ).toBeGreaterThan(0);
  });

  it("submits valid form data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProjectForm {...defaultProps} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Project name/i), "New Core Feature");
    await user.type(screen.getByLabelText(/Description/i), "High level description");

    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      name: "New Core Feature",
      description: "High level description",
      status: "ACTIVE",
      priority: "P3",
      health: "NOT_SET",
      color: "blue",
      icon: "folder",
      coverImageUrl: null,
      startDate: null,
      deadlineDate: null,
      estimatedMinutes: null,
      labels: [],
    });
  });

  it("displays conflict error and resolution callback when conflict occurs", async () => {
    const user = userEvent.setup();
    const onResolveConflict = vi.fn();

    render(
      <ProjectForm
        {...defaultProps}
        mode="edit"
        conflictError="This project was modified by another user."
        onResolveConflict={onResolveConflict}
      />,
    );

    expect(screen.getByText("This project was modified by another user.")).toBeInTheDocument();
    const reloadBtn = screen.getByRole("button", { name: "Reload latest data" });
    await user.click(reloadBtn);
    expect(onResolveConflict).toHaveBeenCalledTimes(1);
  });
});
