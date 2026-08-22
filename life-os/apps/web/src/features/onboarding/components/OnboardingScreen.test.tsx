import { useEffect, type ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthSession, type AuthUser } from "@state/authSession";
import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { OnboardingScreen, type OnboardingScreenProps } from "./OnboardingScreen";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const mockInitialOnboardingResponse = {
  onboardingVersion: 1,
  onboardingStatus: "NOT_STARTED",
  lastCompletedStep: null,
  onboardingCompletedAt: null,
  profile: {
    displayName: "Ada Lovelace",
    timeZone: "Asia/Kolkata",
    locale: "en-IN",
    weekStart: 1,
  },
  planningDefaults: {
    workingDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "17:00",
    overnightSchedule: false,
    dailyFocusTargetMinutes: 240,
    focusDurationMinutes: 25,
    breakDurationMinutes: 5,
  },
};

const mockAuthUser: AuthUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ada@example.test",
  displayName: "Ada Lovelace",
  timeZone: "Asia/Kolkata",
  locale: "en-IN",
  weekStart: 1,
};

function SessionSeeder({
  children,
  user = mockAuthUser,
}: {
  readonly children: ReactNode;
  readonly user?: AuthUser;
}) {
  const { setSession } = useAuthSession();
  useEffect(() => {
    setSession(user, "test-csrf-token");
  }, [setSession, user]);
  return <>{children}</>;
}

function renderScreen(props: OnboardingScreenProps = {}, user: AuthUser = mockAuthUser) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return renderWithUser(
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider restoreSession={false}>
        <SessionSeeder user={user}>
          <OnboardingScreen {...props} />
        </SessionSeeder>
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
}

describe("OnboardingScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders loading state initially while querying /onboarding", () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    renderScreen();

    expect(screen.getByText("Loading onboarding progress...")).toBeInTheDocument();
  });

  it("renders error state when /onboarding query fails and supports retry", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(500, { message: "Server error" }));
    const { user } = renderScreen();

    await waitFor(() => {
      expect(screen.getByText("We couldn't load your onboarding state")).toBeInTheDocument();
    });

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockInitialOnboardingResponse));
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Welcome to LifeOS" }),
      ).toBeInTheDocument();
    });
  });

  it("resumes at Step 1 (Welcome) when lastCompletedStep is null", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockInitialOnboardingResponse));
    renderScreen();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Welcome to LifeOS" }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Display name")).toHaveValue("Ada Lovelace");
      expect(screen.getByText("ada@example.test", { exact: false })).toBeInTheDocument();
    });
  });

  it("resumes at Step 2 (Time and week) when lastCompletedStep is WELCOME", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        ...mockInitialOnboardingResponse,
        onboardingStatus: "IN_PROGRESS",
        lastCompletedStep: "WELCOME",
      }),
    );
    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Time and week" })).toBeInTheDocument();
    });
  });

  it("resumes at Step 3 (Planning defaults) when lastCompletedStep is TIME_AND_WEEK", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        ...mockInitialOnboardingResponse,
        onboardingStatus: "IN_PROGRESS",
        lastCompletedStep: "TIME_AND_WEEK",
      }),
    );
    renderScreen();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Planning defaults" }),
      ).toBeInTheDocument();
    });
  });

  it("resumes at Step 4 (Start) when lastCompletedStep is PLANNING_DEFAULTS", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        ...mockInitialOnboardingResponse,
        onboardingStatus: "IN_PROGRESS",
        lastCompletedStep: "PLANNING_DEFAULTS",
      }),
    );
    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Start LifeOS" })).toBeInTheDocument();
    });
  });

  it("redirects directly to /life-os/app/today if onboarding is already completed", async () => {
    const navigate = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        ...mockInitialOnboardingResponse,
        onboardingStatus: "COMPLETED",
        lastCompletedStep: "START",
        onboardingCompletedAt: "2026-08-19T10:00:00Z",
      }),
    );
    renderScreen({ navigate });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/life-os/app/today");
    });
  });

  it("walks through full 4-step onboarding flow successfully", async () => {
    const navigate = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockInitialOnboardingResponse));

    const { user } = renderScreen({ navigate });

    // Step 1: Welcome
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Welcome to LifeOS" }),
      ).toBeInTheDocument();
    });

    const step1Response = {
      ...mockInitialOnboardingResponse,
      onboardingStatus: "IN_PROGRESS",
      lastCompletedStep: "WELCOME",
      profile: {
        ...mockInitialOnboardingResponse.profile,
        displayName: "Ada Updated",
      },
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, step1Response));

    await user.clear(screen.getByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "Ada Updated");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2: Time and week
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Time and week" })).toBeInTheDocument();
    });

    const step2Response = {
      ...step1Response,
      lastCompletedStep: "TIME_AND_WEEK",
      profile: { ...step1Response.profile, timeZone: "UTC" },
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, step2Response));

    await user.click(screen.getByRole("button", { name: "Use UTC for now" }));
    await user.click(screen.getByRole("button", { name: "Save and continue" }));

    // Step 3: Planning defaults
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Planning defaults" }),
      ).toBeInTheDocument();
    });

    const step3Response = {
      ...step2Response,
      lastCompletedStep: "PLANNING_DEFAULTS",
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, step3Response));

    await user.click(screen.getByRole("button", { name: "Save and continue" }));

    // Step 4: Start LifeOS
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Start LifeOS" })).toBeInTheDocument();
    });

    const step4Response = {
      ...step3Response,
      onboardingStatus: "COMPLETED",
      lastCompletedStep: "START",
      onboardingCompletedAt: "2026-08-19T10:30:00Z",
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, step4Response));

    await user.click(screen.getByRole("button", { name: "Finish setup" }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/life-os/app/today");
    });
  });

  it("handles skipping planning defaults in Step 3", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        ...mockInitialOnboardingResponse,
        onboardingStatus: "IN_PROGRESS",
        lastCompletedStep: "TIME_AND_WEEK",
      }),
    );
    const { user } = renderScreen();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Planning defaults" }),
      ).toBeInTheDocument();
    });

    const skipResponse = {
      ...mockInitialOnboardingResponse,
      onboardingStatus: "IN_PROGRESS",
      lastCompletedStep: "PLANNING_DEFAULTS",
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, skipResponse));

    await user.click(screen.getByRole("button", { name: "Skip for now" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Start LifeOS" })).toBeInTheDocument();
    });
  });

  it("supports Back navigation across steps preserving drafts", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        ...mockInitialOnboardingResponse,
        onboardingStatus: "IN_PROGRESS",
        lastCompletedStep: "TIME_AND_WEEK",
      }),
    );
    const { user } = renderScreen();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Planning defaults" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("heading", { level: 1, name: "Time and week" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to LifeOS" }),
    ).toBeInTheDocument();
  });

  it("validates Step 1 client errors before submission", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockInitialOnboardingResponse));
    const { user } = renderScreen();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Welcome to LifeOS" }),
      ).toBeInTheDocument();
    });

    await user.clear(screen.getByLabelText("Display name"));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getAllByText("Enter your display name.")).toHaveLength(2);
  });

  it("displays server error alert when request fails with unexpected error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockInitialOnboardingResponse));
    const { user } = renderScreen();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Welcome to LifeOS" }),
      ).toBeInTheDocument();
    });

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(500, { detail: "Internal error" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(
        screen.getByText("Failed to save welcome step. Please try again."),
      ).toBeInTheDocument();
    });
  });

  it("handles Sign out action in header", async () => {
    const navigate = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockInitialOnboardingResponse));
    const { user } = renderScreen({ navigate });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Welcome to LifeOS" }),
      ).toBeInTheDocument();
    });

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { message: "Session revoked." }));

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/life-os/login");
    });
  });

  it("passes accessibility sweep", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockInitialOnboardingResponse));
    const { container } = renderScreen();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Welcome to LifeOS" }),
      ).toBeInTheDocument();
    });

    await expectNoAccessibilityViolations(container);
  });
});
