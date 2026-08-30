import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@lib/apiClient";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";

import { HabitsRoute } from "./HabitsRoute";

vi.mock("@lib/apiClient", async () => {
  const actual = await vi.importActual<typeof import("@lib/apiClient")>("@lib/apiClient");
  return { ...actual, apiRequest: vi.fn() };
});

const mockApiRequest = vi.mocked(apiRequest);
const HABIT_DTO = {
  id: "habit-1",
  userId: "user-1",
  name: "Read",
  description: "Read deliberately.",
  cadence: "DAILY",
  targetCount: 2,
  timeZone: "Asia/Kolkata",
  color: "green",
  reminderEnabled: false,
  reminderTime: null,
  archived: false,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-30T00:00:00Z",
  version: 0,
};

const AUTH: AuthSessionValue = {
  user: {
    id: "user-1",
    email: "reader@example.com",
    displayName: "Reader",
    timeZone: "Asia/Kolkata",
    locale: "en-IN",
    weekStart: 1,
  },
  csrfToken: "csrf",
  isBootstrapping: false,
  setSession: vi.fn(),
  clearSession: vi.fn(),
};

function renderRoute(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthSessionContext.Provider value={AUTH}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/life-os/app/habits" element={<HabitsRoute />} />
            <Route path="/life-os/app/habits/:habitId" element={<HabitsRoute />} />
          </Routes>
        </MemoryRouter>
      </AuthSessionContext.Provider>
    </QueryClientProvider>,
  );
}

describe("HabitsRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockApiRequest.mockImplementation((path) => {
      if (path === "/habits?archived=false") return Promise.resolve([HABIT_DTO]);
      if (path === "/habits?archived=true") return Promise.resolve([]);
      if (path === "/habits/habit-1") return Promise.resolve(HABIT_DTO);
      if (path.startsWith("/habits/habit-1/entries?")) {
        return Promise.resolve([
          {
            id: "entry-1",
            habitId: "habit-1",
            userId: "user-1",
            localDate: path.includes("2026-08-29") ? "2026-08-29" : "2026-08-30",
            completedCount: 1,
            createdAt: "2026-08-29T00:00:00Z",
            updatedAt: "2026-08-29T00:00:00Z",
            version: 0,
          },
        ]);
      }
      if (path === "/habits/habit-1/pauses") return Promise.resolve([]);
      if (path.startsWith("/habits/habit-1/stats?")) {
        return Promise.resolve({
          habitId: "habit-1",
          from: "2026-08-01",
          to: "2026-08-30",
          totalDays: 30,
          daysWithEntry: 1,
          daysMeetingTarget: 0,
          totalCompletions: 1,
          completionRate: 0,
          currentStreak: 0,
          longestStreak: 0,
          eligiblePeriods: 30,
          metTargetPeriods: 0,
          cadenceCompletionRate: 0,
        });
      }
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });
  });

  it("restores the list view and local date directly from the URL", async () => {
    renderRoute("/life-os/app/habits?view=list&date=2026-08-29");

    expect(
      await screen.findByRole("tab", { name: "All Habits", selected: true }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-08-29")).toBeInTheDocument();
    expect(await screen.findByText("Read")).toBeInTheDocument();
  });

  it("keeps detail history ranges and the selected statistics tab in the URL", async () => {
    renderRoute(
      "/life-os/app/habits/habit-1?date=2026-08-30&from=2026-08-01&to=2026-08-30&tab=history",
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Read" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "History", selected: true })).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-08-01")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Statistics" }));
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Statistics", selected: true })).toBeInTheDocument(),
    );
  });
});
