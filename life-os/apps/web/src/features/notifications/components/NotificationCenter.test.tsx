import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClientConfiguration } from "@lib/apiClient";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { NotificationCenter } from "./NotificationCenter";
import type { NotificationPageResponse } from "../model/notifications";

const SAMPLE_PAGE_RESPONSE: NotificationPageResponse = {
  items: [
    {
      id: "n-1",
      userId: "user-1",
      category: "DUE_REMINDER",
      title: "Task Due Soon",
      body: "Complete project presentation.",
      targetUrl: "/life-os/app/tasks/1",
      readAt: null,
      isClearable: true,
      createdAt: "2026-09-01T10:00:00Z",
      version: 1,
    },
    {
      id: "n-2",
      userId: "user-1",
      category: "SECURITY",
      title: "Password Changed",
      body: "Your account password was updated.",
      targetUrl: null,
      readAt: "2026-09-01T08:00:00Z",
      isClearable: false,
      createdAt: "2026-09-01T08:00:00Z",
      version: 1,
    },
  ],
  page: 0,
  size: 20,
  totalItems: 2,
  totalPages: 1,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function Wrapper({ children }: { readonly children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("NotificationCenter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("renders notification list and passes accessibility audits", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/notifications/unread-count")) {
        return jsonResponse(200, { count: 1 });
      }
      if (url.includes("/notifications")) {
        return jsonResponse(200, SAMPLE_PAGE_RESPONSE);
      }
      return jsonResponse(404, {});
    });

    const { container } = render(<NotificationCenter />, { wrapper: Wrapper });

    expect(await screen.findByText("Task Due Soon")).toBeInTheDocument();
    expect(screen.getByText("Password Changed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mark all read/i })).not.toBeDisabled();

    await expectNoAccessibilityViolations(container);
  });

  it("shows empty state when no notifications exist", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/notifications/unread-count")) {
        return jsonResponse(200, { count: 0 });
      }
      if (url.includes("/notifications")) {
        return jsonResponse(200, { items: [], page: 0, size: 20, totalItems: 0, totalPages: 0 });
      }
      return jsonResponse(404, {});
    });

    render(<NotificationCenter />, { wrapper: Wrapper });

    expect(await screen.findByTestId("notification-center-empty")).toBeInTheDocument();
    expect(screen.getByText("All caught up!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mark all read/i })).toBeDisabled();
  });

  it("handles unread only toggle and category filtering", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/notifications/unread-count")) {
        return jsonResponse(200, { count: 1 });
      }
      if (url.includes("unreadOnly=true")) {
        return jsonResponse(200, {
          ...SAMPLE_PAGE_RESPONSE,
          items: [SAMPLE_PAGE_RESPONSE.items[0]],
        });
      }
      if (url.includes("/notifications")) {
        return jsonResponse(200, SAMPLE_PAGE_RESPONSE);
      }
      return jsonResponse(404, {});
    });

    render(<NotificationCenter />, { wrapper: Wrapper });

    await screen.findByText("Task Due Soon");

    const unreadCheckbox = screen.getByRole("checkbox", { name: "Unread only" });
    await user.click(unreadCheckbox);

    const calls = vi.mocked(fetch).mock.calls;
    const lastCallUrl = calls[calls.length - 1]![0] as string;
    expect(lastCallUrl).toContain("unreadOnly=true");
  });
});
