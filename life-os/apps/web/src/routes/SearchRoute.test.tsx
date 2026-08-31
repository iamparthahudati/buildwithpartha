import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SearchRoute } from "./SearchRoute";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";
import * as useGlobalSearchModule from "../features/search/hooks/useGlobalSearch";

vi.mock("../features/search/hooks/useGlobalSearch", () => ({
  useGlobalSearch: vi.fn(),
}));

const mockUseGlobalSearch = vi.mocked(useGlobalSearchModule.useGlobalSearch);

const MOCK_AUTH: AuthSessionValue = {
  user: {
    id: "user-123",
    email: "user@example.com",
    displayName: "Test User",
    timeZone: "UTC",
    locale: "en-US",
    weekStart: 1,
  },
  csrfToken: "mock-csrf-token",
  isBootstrapping: false,
  setSession: vi.fn(),
  clearSession: vi.fn(),
};

describe("SearchRoute", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  function renderWithProviders(initialEntries = ["/life-os/app/search?q=project"]) {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthSessionContext.Provider value={MOCK_AUTH}>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/life-os/app/search" element={<SearchRoute />} />
            </Routes>
          </MemoryRouter>
        </AuthSessionContext.Provider>
      </QueryClientProvider>,
    );
  }

  it("reads q parameter from URL and invokes search hook", () => {
    mockUseGlobalSearch.mockReturnValue({
      data: {
        query: "project",
        totalItems: 0,
        page: 0,
        size: 20,
        totalPages: 0,
        counts: {},
        groups: [],
        items: [],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGlobalSearchModule.useGlobalSearch>);

    renderWithProviders(["/life-os/app/search?q=project"]);

    expect(screen.getByDisplayValue("project")).toBeInTheDocument();
    expect(mockUseGlobalSearch).toHaveBeenCalledWith(
      expect.objectContaining({ q: "project", page: 0 }),
      true,
    );
  });

  it("updates URL when filtering by entity type", async () => {
    mockUseGlobalSearch.mockReturnValue({
      data: {
        query: "test",
        totalItems: 1,
        page: 0,
        size: 20,
        totalPages: 1,
        counts: { TASK: 1 },
        groups: [],
        items: [],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGlobalSearchModule.useGlobalSearch>);

    renderWithProviders(["/life-os/app/search?q=test"]);

    const user = userEvent.setup();
    const tasksBtn = screen.getByRole("button", { name: /Tasks/i });
    await user.click(tasksBtn);

    expect(mockUseGlobalSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "test", type: "TASK" }),
      true,
    );
  });
});
