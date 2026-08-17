import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("renders a labelled nav", () => {
    renderWithUser(
      <Pagination
        page={1}
        pageSize={10}
        total={50}
        onPageChange={() => {}}
        label="Tasks pagination"
      />,
    );
    expect(screen.getByRole("navigation", { name: "Tasks pagination" })).toBeInTheDocument();
  });

  it("marks the current page with aria-current and a distinct style", () => {
    renderWithUser(
      <Pagination page={2} pageSize={10} total={50} onPageChange={() => {}} label="Pagination" />,
    );
    const current = screen.getByRole("button", { name: "Page 2" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveClass("is-current");
    expect(screen.getByRole("button", { name: "Page 1" })).not.toHaveAttribute("aria-current");
  });

  it("clicking a page number calls onPageChange with that page", async () => {
    const onPageChange = vi.fn();
    const { user } = renderWithUser(
      <Pagination
        page={1}
        pageSize={10}
        total={50}
        onPageChange={onPageChange}
        label="Pagination"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Page 3" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("disables Previous on the first page and Next on the last page", () => {
    const { rerender } = renderWithUser(
      <Pagination page={1} pageSize={10} total={50} onPageChange={() => {}} label="Pagination" />,
    );
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).not.toBeDisabled();

    rerender(
      <Pagination page={5} pageSize={10} total={50} onPageChange={() => {}} label="Pagination" />,
    );
    expect(screen.getByRole("button", { name: "Previous page" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("Previous and Next move the page by one", async () => {
    const onPageChange = vi.fn();
    const { user } = renderWithUser(
      <Pagination
        page={3}
        pageSize={10}
        total={50}
        onPageChange={onPageChange}
        label="Pagination"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);

    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });

  it("collapses a long page range behind an ellipsis", () => {
    renderWithUser(
      <Pagination page={1} pageSize={10} total={200} onPageChange={() => {}} label="Pagination" />,
    );
    expect(screen.getByText("…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Page 15" })).not.toBeInTheDocument();
  });

  it("computes total pages from total and pageSize, rounding up a partial last page", () => {
    renderWithUser(
      <Pagination page={1} pageSize={10} total={25} onPageChange={() => {}} label="Pagination" />,
    );
    expect(screen.getByRole("button", { name: "Page 3" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Page 4" })).not.toBeInTheDocument();
  });

  it("never goes below one page when total is zero", () => {
    renderWithUser(
      <Pagination page={1} pageSize={10} total={0} onPageChange={() => {}} label="Pagination" />,
    );
    expect(screen.getByRole("button", { name: "Page 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("shows the compact Page X of Y label alongside the numbered buttons", () => {
    renderWithUser(
      <Pagination page={2} pageSize={10} total={50} onPageChange={() => {}} label="Pagination" />,
    );
    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithUser(
      <Pagination page={3} pageSize={10} total={200} onPageChange={() => {}} label="Pagination" />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
