import { useEffect, type ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetApiClientConfiguration } from "@lib/apiClient";
import { useAuthSession, type AuthUser } from "@state/authSession";
import { AuthSessionProvider } from "@state/AuthSessionProvider";

import { useCompleteOnboarding } from "./useCompleteOnboarding";
import { useOnboarding } from "./useOnboarding";
import { useUpdatePlanningDefaultsStep } from "./useUpdatePlanningDefaultsStep";
import { useUpdateTimeAndWeekStep } from "./useUpdateTimeAndWeekStep";
import { useUpdateWelcomeStep } from "./useUpdateWelcomeStep";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const mockUser: AuthUser = {
  id: "user-123",
  email: "user@example.test",
  displayName: "Initial Name",
  timeZone: "UTC",
  locale: "en-US",
  weekStart: 1,
};

function SessionSeeder({
  children,
  user = mockUser,
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

function createWrapper(queryClient: QueryClient, user: AuthUser = mockUser) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider restoreSession={false}>
          <SessionSeeder user={user}>{children}</SessionSeeder>
        </AuthSessionProvider>
      </QueryClientProvider>
    );
  };
}

describe("onboarding hooks", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  describe("useOnboarding", () => {
    it("fetches onboarding data", async () => {
      const queryClient = new QueryClient();
      const mockData = {
        onboardingVersion: 1,
        onboardingStatus: "NOT_STARTED",
        lastCompletedStep: null,
        onboardingCompletedAt: null,
        profile: {
          displayName: "Initial Name",
          timeZone: "UTC",
          locale: "en-US",
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
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockData));

      const { result } = renderHook(() => useOnboarding(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
    });
  });

  describe("useUpdateWelcomeStep", () => {
    it("updates welcome step and synchronizes auth session display name", async () => {
      const queryClient = new QueryClient();
      const updatedData = {
        onboardingVersion: 1,
        onboardingStatus: "IN_PROGRESS",
        lastCompletedStep: "WELCOME",
        onboardingCompletedAt: null,
        profile: {
          displayName: "New Display Name",
          timeZone: "UTC",
          locale: "en-US",
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
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, updatedData));

      const { result } = renderHook(() => useUpdateWelcomeStep(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.mutate({ displayName: "New Display Name" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.profile.displayName).toBe("New Display Name");
    });
  });

  describe("useUpdateTimeAndWeekStep", () => {
    it("updates time and week step and synchronizes auth session timezone", async () => {
      const queryClient = new QueryClient();
      const updatedData = {
        onboardingVersion: 1,
        onboardingStatus: "IN_PROGRESS",
        lastCompletedStep: "TIME_AND_WEEK",
        onboardingCompletedAt: null,
        profile: {
          displayName: "Initial Name",
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
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, updatedData));

      const { result } = renderHook(() => useUpdateTimeAndWeekStep(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.mutate({
          timeZone: "Asia/Kolkata",
          locale: "en-IN",
          weekStart: 1,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.profile.timeZone).toBe("Asia/Kolkata");
    });
  });

  describe("useUpdatePlanningDefaultsStep", () => {
    it("updates planning defaults step", async () => {
      const queryClient = new QueryClient();
      const updatedData = {
        onboardingVersion: 1,
        onboardingStatus: "IN_PROGRESS",
        lastCompletedStep: "PLANNING_DEFAULTS",
        onboardingCompletedAt: null,
        profile: {
          displayName: "Initial Name",
          timeZone: "UTC",
          locale: "en-US",
          weekStart: 1,
        },
        planningDefaults: {
          workingDays: [1, 2, 3, 4],
          workStartTime: "10:00",
          workEndTime: "18:00",
          overnightSchedule: false,
          dailyFocusTargetMinutes: 300,
          focusDurationMinutes: 50,
          breakDurationMinutes: 10,
        },
      };
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, updatedData));

      const { result } = renderHook(() => useUpdatePlanningDefaultsStep(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.mutate({
          workingDays: [1, 2, 3, 4],
          workStartTime: "10:00",
          workEndTime: "18:00",
          overnightSchedule: false,
          dailyFocusTargetMinutes: 300,
          focusDurationMinutes: 50,
          breakDurationMinutes: 10,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.lastCompletedStep).toBe("PLANNING_DEFAULTS");
    });
  });

  describe("useCompleteOnboarding", () => {
    it("completes onboarding lifecycle", async () => {
      const queryClient = new QueryClient();
      const completedData = {
        onboardingVersion: 1,
        onboardingStatus: "COMPLETED",
        lastCompletedStep: "START",
        onboardingCompletedAt: "2026-08-19T11:00:00Z",
        profile: {
          displayName: "Initial Name",
          timeZone: "UTC",
          locale: "en-US",
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
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, completedData));

      const { result } = renderHook(() => useCompleteOnboarding(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.onboardingStatus).toBe("COMPLETED");
    });
  });
});
