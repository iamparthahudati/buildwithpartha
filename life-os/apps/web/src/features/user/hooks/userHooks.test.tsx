import { useEffect, type ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetApiClientConfiguration } from "@lib/apiClient";
import { useAuthSession, type AuthUser } from "@state/authSession";
import { AuthSessionProvider } from "@state/AuthSessionProvider";

import { useUpdateUserPreferences } from "./useUpdateUserPreferences";
import { useUpdateUserProfile } from "./useUpdateUserProfile";
import { useUserPreferences } from "./useUserPreferences";
import { useUserProfile } from "./useUserProfile";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const mockUser: AuthUser = {
  id: "user-123",
  email: "partha@example.test",
  displayName: "Partha H",
  timeZone: "UTC",
  locale: "en-IN",
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

describe("user hooks", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  describe("useUserProfile", () => {
    it("fetches user profile", async () => {
      const queryClient = new QueryClient();
      const mockProfile = {
        id: "user-123",
        email: "partha@example.test",
        displayName: "Partha H",
        timeZone: "Asia/Kolkata",
        locale: "en-IN",
        weekStart: 1,
      };
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockProfile));

      const { result } = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockProfile);
    });
  });

  describe("useUpdateUserProfile", () => {
    it("updates profile and synchronizes auth session state", async () => {
      const queryClient = new QueryClient();
      const updatedProfile = {
        id: "user-123",
        email: "partha@example.test",
        displayName: "Partha Hudati",
        timeZone: "Asia/Kolkata",
        locale: "en-IN",
        weekStart: 7,
      };
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, updatedProfile));

      const { result } = renderHook(() => useUpdateUserProfile(), {
        wrapper: createWrapper(queryClient),
      });

      act(() => {
        result.current.mutate({
          displayName: "Partha Hudati",
          timeZone: "Asia/Kolkata",
          locale: "en-IN",
          weekStart: 7,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(updatedProfile);
    });
  });

  describe("useUserPreferences", () => {
    it("fetches user preferences", async () => {
      const queryClient = new QueryClient();
      const mockPreferences = {
        userId: "user-123",
        onboardingVersion: 1,
        onboardingStatus: "COMPLETED",
        lastCompletedStep: "START",
        onboardingCompletedAt: "2026-08-19T00:00:00Z",
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
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockPreferences));

      const { result } = renderHook(() => useUserPreferences(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockPreferences);
    });
  });

  describe("useUpdateUserPreferences", () => {
    it("updates user preferences", async () => {
      const queryClient = new QueryClient();
      const updatedPreferences = {
        userId: "user-123",
        onboardingVersion: 1,
        onboardingStatus: "COMPLETED",
        lastCompletedStep: "START",
        onboardingCompletedAt: "2026-08-19T00:00:00Z",
        planningDefaults: {
          workingDays: [1, 2, 3, 4],
          workStartTime: "10:00",
          workEndTime: "18:00",
          overnightSchedule: false,
          dailyFocusTargetMinutes: 300,
          focusDurationMinutes: 50,
          breakDurationMinutes: 10,
          longBreakDurationMinutes: 20,
          focusSessionsBeforeLongBreak: 4,
          autoStartBreaks: false,
          autoStartFocusSessions: false,
          soundEnabled: false,
          browserNotificationsEnabled: false,
        },
      };
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, updatedPreferences));

      const { result } = renderHook(() => useUpdateUserPreferences(), {
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
          longBreakDurationMinutes: 20,
          focusSessionsBeforeLongBreak: 4,
          autoStartBreaks: false,
          autoStartFocusSessions: false,
          soundEnabled: false,
          browserNotificationsEnabled: false,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(updatedPreferences);
    });
  });
});
