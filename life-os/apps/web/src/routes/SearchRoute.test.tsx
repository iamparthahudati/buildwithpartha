import { screen } from "@testing-library/react";
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
  }) => (
    <div>
      <p data-testid="search-query">Query: {props.query}</p>
      <p data-testid="search-type">Type: {props.type ?? "none"}</p>
      <button type="button" onClick={() => props.onQueryChange("newquery")}>
        Change Query
      </button>
      <button type="button" onClick={() => props.onTypeChange("TASK")}>
        Filter Tasks
      </button>
    </div>
  ),
}));

describe("SearchRoute", () => {
  it("reads q and type parameters from URL and passes to SearchScreen", () => {
    renderWithUser(
      <AuthSessionContext.Provider value={mockAuth}>
        <MemoryRouter initialEntries={["/life-os/app/search?q=project&type=TASK"]}>
          <Routes>
            <Route path="/life-os/app/search" element={<SearchRoute />} />
          </Routes>
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    );

    expect(screen.getByTestId("search-query")).toHaveTextContent("Query: project");
    expect(screen.getByTestId("search-type")).toHaveTextContent("Type: TASK");
  });

  it("updates URL when query and type filters change", async () => {
    const { user } = renderWithUser(
      <AuthSessionContext.Provider value={mockAuth}>
        <MemoryRouter initialEntries={["/life-os/app/search?q=test"]}>
          <Routes>
            <Route path="/life-os/app/search" element={<SearchRoute />} />
          </Routes>
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    );

    expect(screen.getByTestId("search-query")).toHaveTextContent("Query: test");

    await user.click(screen.getByRole("button", { name: "Filter Tasks" }));
    expect(screen.getByTestId("search-type")).toHaveTextContent("Type: TASK");
  });
});
