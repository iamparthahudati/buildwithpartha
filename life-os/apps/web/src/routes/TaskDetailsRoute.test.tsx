import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { IntegratedTaskDetailsProps } from "@features/tasks";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";
import { ToastProvider } from "@state/ToastProvider";

import { TaskDetailsRoute } from "./TaskDetailsRoute";

vi.mock("@features/tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@features/tasks")>();
  return {
    ...actual,
    IntegratedTaskDetails: (props: IntegratedTaskDetailsProps) => (
      <div
        data-testid="integrated-task-details"
        data-task-id={props.taskId}
        data-back-href={props.backHref}
        data-selected-tab={props.selectedTab}
      />
    ),
  };
});

const AUTH_STATE: AuthSessionValue = {
  user: {
    id: "user-1",
    email: "test@example.com",
    displayName: "Test User",
    timeZone: "Asia/Kolkata",
    locale: "en-IN",
    weekStart: 1,
  },
  csrfToken: "csrf",
  isBootstrapping: false,
  setSession: vi.fn(),
  clearSession: vi.fn(),
};

function renderRoute(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthSessionContext.Provider value={AUTH_STATE}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/life-os/app/tasks/:taskId" element={<TaskDetailsRoute />} />
            </Routes>
          </MemoryRouter>
        </AuthSessionContext.Provider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("TaskDetailsRoute", () => {
  it("restores a deep-linked tab and exact validated Tasks return path after refresh", () => {
    const returnTo = "/life-os/app/tasks?status=IN_PROGRESS&q=review&page=2";
    renderRoute(
      `/life-os/app/tasks/task-1?returnTo=${encodeURIComponent(returnTo)}&tab=dependencies`,
    );

    expect(screen.getByTestId("integrated-task-details")).toHaveAttribute("data-task-id", "task-1");
    expect(screen.getByTestId("integrated-task-details")).toHaveAttribute(
      "data-back-href",
      returnTo,
    );
    expect(screen.getByTestId("integrated-task-details")).toHaveAttribute(
      "data-selected-tab",
      "dependencies",
    );
  });

  it("rejects external/non-list return paths and unknown tabs", () => {
    renderRoute(
      "/life-os/app/tasks/task-1?returnTo=https%3A%2F%2Fevil.example%2Fcollect&tab=unknown",
    );

    expect(screen.getByTestId("integrated-task-details")).toHaveAttribute(
      "data-back-href",
      "/life-os/app/tasks",
    );
    expect(screen.getByTestId("integrated-task-details")).toHaveAttribute(
      "data-selected-tab",
      "details",
    );
  });
});
