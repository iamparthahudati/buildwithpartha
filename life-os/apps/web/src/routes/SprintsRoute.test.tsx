import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@lib/apiClient";
import { AuthSessionContext, type AuthSessionValue, type AuthUser } from "@state/authSession";
import { ToastProvider } from "@state/ToastProvider";
import { renderWithUser } from "@test/render";
import type { SprintResponseDto } from "@features/sprints";

import { SprintsRoute } from "./SprintsRoute";

vi.mock("@lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lib/apiClient")>();
  return { ...actual, apiRequest: vi.fn() };
});

const mockApiRequest = vi.mocked(apiRequest);

const USER: AuthUser = {
  id: "user-1",
  email: "owner@example.com",
  displayName: "LifeOS Owner",
  timeZone: "Asia/Kolkata",
  locale: "en-US",
  weekStart: 1,
};

const PLANNED_SPRINT: SprintResponseDto = {
  id: "sprint-next",
  name: "Next Sprint",
  goal: "Finish the Sprint workflow",
  startDate: "2026-09-01",
  endDate: "2026-09-07",
  status: "PLANNED",
  targetCapacityPoints: 8,
  committedTaskCount: 0,
  completedTaskCount: 0,
  addedTaskCount: 0,
  removedTaskCount: 0,
  carriedOverTaskCount: 0,
  totalStoryPoints: 0,
  completedStoryPoints: 0,
  actionItems: [],
  createdAt: "2026-08-25T08:00:00Z",
  updatedAt: "2026-08-25T08:00:00Z",
  tasks: [],
  events: [],
  version: 6,
};

const AUTH_STATE: AuthSessionValue = {
  user: USER,
  csrfToken: "csrf-token",
  isBootstrapping: false,
  setSession: vi.fn(),
  clearSession: vi.fn(),
};

function renderRoute(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithUser(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthSessionContext.Provider value={AUTH_STATE}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/life-os/app/sprints" element={<SprintsRoute />} />
              <Route path="/life-os/app/sprints/:sprintId" element={<SprintsRoute />} />
            </Routes>
          </MemoryRouter>
        </AuthSessionContext.Provider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("SprintsRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockApiRequest.mockImplementation((path, init) => {
      if (path.startsWith("/projects")) {
        return Promise.resolve({
          page: { items: [], page: 0, size: 100, totalItems: 0, totalPages: 0 },
          summary: {
            total: 0,
            active: 0,
            completed: 0,
            onHold: 0,
            atRisk: 0,
            averageProgress: 0,
          },
        });
      }
      if (path.startsWith("/tasks")) {
        return Promise.resolve({
          page: { items: [], page: 0, size: 100, totalItems: 0, totalPages: 0 },
          summary: {
            total: 0,
            toDo: 0,
            inProgress: 0,
            blocked: 0,
            done: 0,
            cancelled: 0,
            overdue: 0,
            mit: 0,
          },
        });
      }
      if (path === "/sprints" && init?.method === "GET") {
        return Promise.resolve([PLANNED_SPRINT]);
      }
      if (path === "/sprints/sprint-next" && init?.method === "GET") {
        return Promise.resolve(PLANNED_SPRINT);
      }
      if (path === "/sprints/sprint-next/start" && init?.method === "POST") {
        return Promise.resolve({ ...PLANNED_SPRINT, status: "ACTIVE", version: 7 });
      }
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });
  });

  it("reads the upcoming URL view and sends the authoritative start version", async () => {
    const { user } = renderRoute("/life-os/app/sprints?view=upcoming");

    expect(await screen.findByText("Next Sprint")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Upcoming (1)" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Start Sprint" }));
    await user.click(screen.getAllByRole("button", { name: "Start Sprint" })[1]!);

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/sprints/sprint-next/start", {
        method: "POST",
        body: { version: 6 },
      }),
    );
  });

  it("loads a canonical Sprint deep link and derives its view", async () => {
    renderRoute("/life-os/app/sprints/sprint-next");

    expect(await screen.findByText("Next Sprint")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Upcoming (1)" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(mockApiRequest).toHaveBeenCalledWith("/sprints/sprint-next", {
      method: "GET",
      signal: expect.any(AbortSignal),
    });
  });
});
