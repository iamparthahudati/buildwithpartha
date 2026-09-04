import { act, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { renderWithUser } from "@test/render";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";
import { SearchRoute } from "./SearchRoute";

const mockAuth: AuthSessionValue = {
  user: {
    id: "user-123",
    email: "user@example.test",
    displayName: "Test User",
    timeZone: "UTC",
    locale: "en-US",
    weekStart: 1,
  },
  csrfToken: "test-csrf-token",
  isBootstrapping: false,
  setSession: vi.fn(),
  clearSession: vi.fn(),
};

vi.mock("@features/search", () => ({
  SEARCH_ENTITY_TYPES: [
    "TASK",
    "PROJECT",
    "NOTE",
    "HABIT",
    "TIME_BLOCK",
    "GOAL",
    "SPRINT",
    "BRAIN_DUMP",
  ],
  SearchScreen: (props: {
    query?: string;
    type?: string;
    page?: number;
    onQueryChange: (q: string) => void;
    onTypeChange: (t?: string) => void;
    onPageChange: (p: number) => void;
    onNavigateToItem: (href: string) => void;
    isOnline?: boolean;
  }) => (
    <div>
      <p data-testid="search-query">Query: {props.query}</p>
      <p data-testid="search-type">Type: {props.type ?? "none"}</p>
      <p data-testid="search-page">Page: {props.page ?? 1}</p>
      <p data-testid="search-online">{props.isOnline ? "online" : "offline"}</p>
      <button type="button" onClick={() => props.onQueryChange("newquery")}>
        Change Query
      </button>
      <button type="button" onClick={() => props.onQueryChange("")}>
        Clear Query
      </button>
      <button type="button" onClick={() => props.onTypeChange("TASK")}>
        Filter Tasks
      </button>
      <button type="button" onClick={() => props.onTypeChange(undefined)}>
        Clear Type
      </button>
      <button type="button" onClick={() => props.onPageChange(2)}>
        Next Page
      </button>
      <button type="button" onClick={() => props.onPageChange(1)}>
        First Page
      </button>
      <button type="button" onClick={() => props.onNavigateToItem("/target")}>
        Navigate Item
      </button>
    </div>
  ),
}));

describe("SearchRoute", () => {
  it("reads q and type parameters from URL and passes to SearchScreen", () => {
    renderWithUser(
      <AuthSessionContext.Provider value={mockAuth}>
        <MemoryRouter initialEntries={["/life-os/app/search?q=project&type=TASK&page=3"]}>
          <Routes>
            <Route path="/life-os/app/search" element={<SearchRoute />} />
          </Routes>
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    );

    expect(screen.getByTestId("search-query")).toHaveTextContent("Query: project");
    expect(screen.getByTestId("search-type")).toHaveTextContent("Type: TASK");
    expect(screen.getByTestId("search-page")).toHaveTextContent("Page: 3");
  });

  it("updates URL when query, type, page, and navigation actions trigger", async () => {
    const { user } = renderWithUser(
      <AuthSessionContext.Provider value={mockAuth}>
        <MemoryRouter initialEntries={["/life-os/app/search?q=test"]}>
          <Routes>
            <Route path="/life-os/app/search" element={<SearchRoute />} />
            <Route path="/target" element={<div>Target Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    );

    expect(screen.getByTestId("search-query")).toHaveTextContent("Query: test");

    await user.click(screen.getByRole("button", { name: "Filter Tasks" }));
    expect(screen.getByTestId("search-type")).toHaveTextContent("Type: TASK");

    await user.click(screen.getByRole("button", { name: "Clear Type" }));
    expect(screen.getByTestId("search-type")).toHaveTextContent("Type: none");

    await user.click(screen.getByRole("button", { name: "Change Query" }));
    expect(screen.getByTestId("search-query")).toHaveTextContent("Query: newquery");

    await user.click(screen.getByRole("button", { name: "Clear Query" }));
    expect(screen.getByTestId("search-query")).toHaveTextContent("Query:");

    await user.click(screen.getByRole("button", { name: "Next Page" }));
    expect(screen.getByTestId("search-page")).toHaveTextContent("Page: 2");

    await user.click(screen.getByRole("button", { name: "First Page" }));
    expect(screen.getByTestId("search-page")).toHaveTextContent("Page: 1");

    await user.click(screen.getByRole("button", { name: "Navigate Item" }));
    expect(screen.getByText("Target Page")).toBeInTheDocument();
  });

  it("tracks online and offline window events", () => {
    renderWithUser(
      <AuthSessionContext.Provider value={mockAuth}>
        <MemoryRouter initialEntries={["/life-os/app/search"]}>
          <Routes>
            <Route path="/life-os/app/search" element={<SearchRoute />} />
          </Routes>
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    );

    expect(screen.getByTestId("search-online")).toHaveTextContent("online");

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByTestId("search-online")).toHaveTextContent("offline");

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.getByTestId("search-online")).toHaveTextContent("online");
  });
});
