import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableSelectAllCell,
  TableSelectCell,
} from "./Table";

function BasicTable() {
  return (
    <Table caption="Tasks">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>Fix header</TableCell>
          <TableCell>Open</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Ship release</TableCell>
          <TableCell>Done</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

describe("Table primitives", () => {
  it("renders a real table with a visually hidden caption", () => {
    renderWithUser(<BasicTable />);
    const table = screen.getByRole("table", { name: "Tasks" });
    expect(table).toBeInTheDocument();
  });

  it("renders real column headers with scope=col", () => {
    renderWithUser(<BasicTable />);
    const nameHeader = screen.getByRole("columnheader", { name: "Name" });
    expect(nameHeader).toHaveAttribute("scope", "col");
  });

  it("renders every row and cell", () => {
    renderWithUser(<BasicTable />);
    const rows = screen.getAllByRole("row");
    // Header row + two body rows.
    expect(rows).toHaveLength(3);
    expect(within(rows[1]!).getByText("Fix header")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Ship release")).toBeInTheDocument();
  });

  it("marks a selected row with aria-selected", () => {
    renderWithUser(
      <Table>
        <TableBody>
          <TableRow selected>
            <TableCell>Selected row</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Unselected row</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const rows = screen.getAllByRole("row");
    expect(rows[0]).toHaveAttribute("aria-selected", "true");
    expect(rows[1]).not.toHaveAttribute("aria-selected");
  });

  it("exposes sort direction via aria-sort", () => {
    renderWithUser(
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell sortDirection="ascending">Name</TableHeaderCell>
          </TableRow>
        </TableHead>
      </Table>,
    );
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });

  it("marks a truncated cell with the truncation class", () => {
    renderWithUser(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell truncate>A very long value that should truncate</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText("A very long value that should truncate")).toHaveClass(
      "lifeos-table__cell--truncate",
    );
  });

  it("applies the density attribute to the table element", () => {
    renderWithUser(
      <Table density="compact">
        <TableBody>
          <TableRow>
            <TableCell>Row</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("table")).toHaveAttribute("data-density", "compact");
  });

  it("select-all checkbox reflects checked and indeterminate state and calls onChange", async () => {
    const onChange = vi.fn();
    const { user } = renderWithUser(
      <Table>
        <TableHead>
          <TableRow>
            <TableSelectAllCell checked={false} indeterminate onChange={onChange} />
          </TableRow>
        </TableHead>
      </Table>,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Select all rows" });
    expect(checkbox).toHaveProperty("indeterminate", true);

    await user.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("row select checkbox names the specific row and calls onChange", async () => {
    const onChange = vi.fn();
    const { user } = renderWithUser(
      <Table>
        <TableBody>
          <TableRow>
            <TableSelectCell checked={false} onChange={onChange} label="Select Fix header" />
          </TableRow>
        </TableBody>
      </Table>,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Select Fix header" });
    await user.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("has no axe violations", async () => {
    const { container } = renderWithUser(<BasicTable />);
    await expectNoAccessibilityViolations(container);
  });
});
