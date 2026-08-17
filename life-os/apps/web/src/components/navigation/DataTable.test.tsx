import { useState } from "react";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { DataTable, type DataTableColumn } from "./DataTable";

interface DemoTask {
  readonly id: string;
  readonly name: string;
  readonly status: string;
}

const TASKS: readonly DemoTask[] = [
  { id: "1", name: "Fix header", status: "Open" },
  { id: "2", name: "Ship release", status: "Done" },
];

const COLUMNS: readonly DataTableColumn<DemoTask>[] = [
  { key: "name", header: "Name", render: (task) => task.name },
  { key: "status", header: "Status", render: (task) => task.status },
];

describe("DataTable", () => {
  it("renders a real table with the given columns and rows", () => {
    renderWithUser(
      <DataTable
        label="Tasks"
        columns={COLUMNS}
        rows={TASKS}
        getRowId={(task) => task.id}
        emptyTitle="No tasks"
      />,
    );

    expect(screen.getByRole("table", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByText("Fix header")).toBeInTheDocument();
    expect(screen.getByText("Ship release")).toBeInTheDocument();
  });

  it("shows EmptyState with the caller's own copy when there are no rows", () => {
    renderWithUser(
      <DataTable
        label="Tasks"
        columns={COLUMNS}
        rows={[]}
        getRowId={(task) => task.id}
        emptyTitle="No tasks match these filters"
        emptyDescription="Try clearing a filter."
      />,
    );

    expect(screen.getByText("No tasks match these filters")).toBeInTheDocument();
    expect(screen.getByText("Try clearing a filter.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows ErrorState with the caller's own message and an optional retry", async () => {
    const onRetry = vi.fn();
    const { user } = renderWithUser(
      <DataTable
        label="Tasks"
        columns={COLUMNS}
        rows={[]}
        getRowId={(task) => task.id}
        emptyTitle="No tasks"
        status={{ type: "error", message: "The server did not respond.", onRetry }}
      />,
    );

    expect(screen.getByText("The server did not respond.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows skeleton loading rows instead of real data while loading", () => {
    const { container } = renderWithUser(
      <DataTable
        label="Tasks"
        columns={COLUMNS}
        rows={TASKS}
        getRowId={(task) => task.id}
        emptyTitle="No tasks"
        status={{ type: "loading" }}
      />,
    );

    expect(screen.queryByText("Fix header")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".lifeos-skeleton").length).toBeGreaterThan(0);
  });

  it("wires selection: selecting a row and select-all both update the caller's own state", async () => {
    function Harness() {
      const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
      return (
        <DataTable
          label="Tasks"
          columns={COLUMNS}
          rows={TASKS}
          getRowId={(task) => task.id}
          getRowLabel={(task) => task.name}
          emptyTitle="No tasks"
          selection={{ selectedIds, onSelectedIdsChange: setSelectedIds }}
        />
      );
    }
    const { user } = renderWithUser(<Harness />);

    await user.click(screen.getByRole("checkbox", { name: "Select Fix header" }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select Ship release" })).toBeChecked();
  });

  it("unchecking a single selected row removes just that id", async () => {
    function Harness() {
      const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set(["1", "2"]));
      return (
        <DataTable
          label="Tasks"
          columns={COLUMNS}
          rows={TASKS}
          getRowId={(task) => task.id}
          getRowLabel={(task) => task.name}
          emptyTitle="No tasks"
          selection={{ selectedIds, onSelectedIdsChange: setSelectedIds }}
        />
      );
    }
    const { user } = renderWithUser(<Harness />);

    await user.click(screen.getByRole("checkbox", { name: "Select Fix header" }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select Ship release" })).toBeChecked();
  });

  it("unchecking select-all when every row is selected clears the selection", async () => {
    function Harness() {
      const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set(["1", "2"]));
      return (
        <DataTable
          label="Tasks"
          columns={COLUMNS}
          rows={TASKS}
          getRowId={(task) => task.id}
          emptyTitle="No tasks"
          selection={{ selectedIds, onSelectedIdsChange: setSelectedIds }}
        />
      );
    }
    const { user } = renderWithUser(<Harness />);

    expect(screen.getByRole("checkbox", { name: "Select all rows" })).toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it("Clear selection empties the selection", async () => {
    function Harness() {
      const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set(["1"]));
      return (
        <DataTable
          label="Tasks"
          columns={COLUMNS}
          rows={TASKS}
          getRowId={(task) => task.id}
          emptyTitle="No tasks"
          selection={{ selectedIds, onSelectedIdsChange: setSelectedIds }}
        />
      );
    }
    const { user } = renderWithUser(<Harness />);

    expect(screen.getByText("1 selected")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument();
  });

  it("renders caller-supplied bulk actions only once a row is selected", () => {
    function Harness() {
      const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
      return (
        <DataTable
          label="Tasks"
          columns={COLUMNS}
          rows={TASKS}
          getRowId={(task) => task.id}
          emptyTitle="No tasks"
          selection={{
            selectedIds,
            onSelectedIdsChange: setSelectedIds,
            bulkActions: <button type="button">Archive</button>,
          }}
        />
      );
    }
    renderWithUser(<Harness />);
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  });

  it("renders caller-supplied filter controls and result count via FilterBar", () => {
    renderWithUser(
      <DataTable
        label="Tasks"
        columns={COLUMNS}
        rows={TASKS}
        getRowId={(task) => task.id}
        emptyTitle="No tasks"
        filters={{ controls: <p>Status filter here</p>, resultCount: "2 tasks" }}
      />,
    );
    expect(screen.getByText("Status filter here")).toBeInTheDocument();
    expect(screen.getByText("2 tasks")).toBeInTheDocument();
  });

  it("reflects the active sort field's direction on its column header", () => {
    renderWithUser(
      <DataTable
        label="Tasks"
        columns={COLUMNS}
        rows={TASKS}
        getRowId={(task) => task.id}
        emptyTitle="No tasks"
        sort={{
          options: [{ id: "name", label: "Name" }],
          value: { optionId: "name", direction: "asc" },
          onChange: () => {},
        }}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });

  it("renders pagination when configured and forwards page changes", async () => {
    const onPageChange = vi.fn();
    const { user } = renderWithUser(
      <DataTable
        label="Tasks"
        columns={COLUMNS}
        rows={TASKS}
        getRowId={(task) => task.id}
        emptyTitle="No tasks"
        pagination={{ page: 1, pageSize: 2, total: 10, onPageChange }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Page 2" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("renders a caller-supplied card for each row when renderCard is given", () => {
    renderWithUser(
      <DataTable
        label="Tasks"
        columns={COLUMNS}
        rows={TASKS}
        getRowId={(task) => task.id}
        emptyTitle="No tasks"
        renderCard={(task) => <span>{task.name} card</span>}
      />,
    );
    expect(screen.getByText("Fix header card")).toBeInTheDocument();
    expect(screen.getByText("Ship release card")).toBeInTheDocument();
  });

  it("truncates a column marked truncate", () => {
    const truncatingColumns: readonly DataTableColumn<DemoTask>[] = [
      { key: "name", header: "Name", render: (task) => task.name, truncate: true },
    ];
    renderWithUser(
      <DataTable
        label="Tasks"
        columns={truncatingColumns}
        rows={TASKS}
        getRowId={(task) => task.id}
        emptyTitle="No tasks"
      />,
    );
    expect(screen.getByText("Fix header")).toHaveClass("lifeos-table__cell--truncate");
  });

  it("has no axe violations with selection, filters, sort and pagination configured", async () => {
    function Harness() {
      const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
      return (
        <DataTable
          label="Tasks"
          columns={COLUMNS}
          rows={TASKS}
          getRowId={(task) => task.id}
          emptyTitle="No tasks"
          filters={{ controls: <p>Filter controls</p>, resultCount: "2 tasks" }}
          sort={{
            options: [{ id: "name", label: "Name" }],
            value: { optionId: "name", direction: "asc" },
            onChange: () => {},
          }}
          pagination={{ page: 1, pageSize: 2, total: 10, onPageChange: () => {} }}
          selection={{ selectedIds, onSelectedIdsChange: setSelectedIds }}
        />
      );
    }
    const { container } = renderWithUser(<Harness />);
    await expectNoAccessibilityViolations(container);
  });
});
