import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { SearchScreen } from "./SearchScreen";
import * as useGlobalSearchModule from "../hooks/useGlobalSearch";

vi.mock("../hooks/useGlobalSearch", () => ({
  useGlobalSearch: vi.fn(),
}));

describe("SearchScreen", () => {
  const defaultProps = {
    query: "",
    onQueryChange: vi.fn(),
    onTypeChange: vi.fn(),
    onPageChange: vi.fn(),
    onNavigateToItem: vi.fn(),
    userId: "test-user-1",
    isOnline: true,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders search bar and empty prompt state when query is empty", async () => {
    vi.mocked(useGlobalSearchModule.useGlobalSearch).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGlobalSearchModule.useGlobalSearch>);

    const { container } = render(<SearchScreen {...defaultProps} />);

    expect(screen.getByRole("heading", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Type to search/i)).toBeInTheDocument();
    expect(screen.getByText("Search your workspace")).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders grouped search results and handles filter tab selection", async () => {
    const mockData = {
      query: "project",
      totalItems: 2,
      page: 0,
      size: 20,
      totalPages: 1,
      counts: { PROJECT: 1, TASK: 1 },
      groups: [
        {
          type: "PROJECT" as const,
          totalItems: 1,
          items: [
            {
              id: "proj-1",
              type: "PROJECT" as const,
              title: "Alpha Project",
              snippet: "Main project overview",
              score: 100,
              updatedAt: "2026-08-30T10:00:00Z",
              href: "/life-os/app/projects/proj-1",
            },
          ],
        },
        {
          type: "TASK" as const,
          totalItems: 1,
          items: [
            {
              id: "task-1",
              type: "TASK" as const,
              title: "Project Task 1",
              snippet: "Task description",
              score: 80,
              updatedAt: "2026-08-30T11:00:00Z",
              href: "/life-os/app/tasks/task-1",
            },
          ],
        },
      ],
      items: [],
    };

    vi.mocked(useGlobalSearchModule.useGlobalSearch).mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGlobalSearchModule.useGlobalSearch>);

    const onTypeChange = vi.fn();
    const onNavigateToItem = vi.fn();

    const { container } = render(
      <SearchScreen
        {...defaultProps}
        query="project"
        onTypeChange={onTypeChange}
        onNavigateToItem={onNavigateToItem}
      />,
    );

    expect(screen.getByText("Alpha Project")).toBeInTheDocument();
    expect(screen.getByText("Project Task 1")).toBeInTheDocument();

    const user = userEvent.setup();
    const taskFilterBtn = screen.getByRole("button", { name: /Tasks/i });
    await user.click(taskFilterBtn);

    expect(onTypeChange).toHaveBeenCalledWith("TASK");

    const resultCard = screen.getByText("Alpha Project").closest("a");
    expect(resultCard).toBeInTheDocument();
    if (resultCard) {
      await user.click(resultCard);
      expect(onNavigateToItem).toHaveBeenCalledWith("/life-os/app/projects/proj-1");
    }

    await expectNoAccessibilityViolations(container);
  });

  it("renders loading spinner state", () => {
    vi.mocked(useGlobalSearchModule.useGlobalSearch).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGlobalSearchModule.useGlobalSearch>);

    render(<SearchScreen {...defaultProps} query="loading test" />);

    expect(screen.getByText("Searching workspace…")).toBeInTheDocument();
  });

  it("renders offline warning message when isOnline is false", () => {
    vi.mocked(useGlobalSearchModule.useGlobalSearch).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGlobalSearchModule.useGlobalSearch>);

    render(<SearchScreen {...defaultProps} isOnline={false} />);

    expect(screen.getByText(/Offline mode/i)).toBeInTheDocument();
  });
});
