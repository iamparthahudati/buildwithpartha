import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetApiClientConfiguration } from "@lib/apiClient";
import { expectNoAccessibilityViolations } from "@test/accessibility";

import { FocusPreferencesPanel } from "./FocusPreferencesPanel";

const PREFERENCES = {
  planningDefaults: {
    workingDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "17:00",
    overnightSchedule: false,
    dailyFocusTargetMinutes: 120,
    focusDurationMinutes: 25,
    breakDurationMinutes: 5,
    longBreakDurationMinutes: 15,
    focusSessionsBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartFocusSessions: false,
    soundEnabled: false,
    browserNotificationsEnabled: false,
  },
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

describe("FocusPreferencesPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("loads safe defaults with an accessible form", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, PREFERENCES));

    const { container } = render(<FocusPreferencesPanel />, { wrapper: Wrapper });

    await screen.findByTestId("focus-preferences-panel");
    expect(screen.getByRole("spinbutton", { name: /Focus duration/ })).toHaveValue(25);
    expect(screen.getByRole("spinbutton", { name: /Long break duration/ })).toHaveValue(15);
    expect(screen.getByRole("checkbox", { name: /Start breaks automatically/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Show browser notifications/ })).not.toBeChecked();
    await expectNoAccessibilityViolations(container);
  });

  it("validates bounded cycle values before saving", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, PREFERENCES));
    render(<FocusPreferencesPanel />, { wrapper: Wrapper });

    const focusDuration = await screen.findByRole("spinbutton", { name: /Focus duration/ });
    await user.clear(focusDuration);
    await user.type(focusDuration, "0");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findAllByText("Choose a focus duration from 1 to 1,440 minutes."),
    ).toHaveLength(2);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("requests browser permission explicitly and saves the complete preference contract", async () => {
    const user = userEvent.setup();
    const requestPermission = vi.fn().mockResolvedValue("granted");
    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, PREFERENCES))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          planningDefaults: {
            ...PREFERENCES.planningDefaults,
            focusDurationMinutes: 50,
            longBreakDurationMinutes: 20,
            autoStartBreaks: true,
            soundEnabled: true,
            browserNotificationsEnabled: true,
          },
        }),
      );

    render(<FocusPreferencesPanel />, { wrapper: Wrapper });
    const focusDuration = await screen.findByRole("spinbutton", { name: /Focus duration/ });
    const longBreak = screen.getByRole("spinbutton", { name: /Long break duration/ });
    await user.clear(focusDuration);
    await user.type(focusDuration, "50");
    await user.clear(longBreak);
    await user.type(longBreak, "20");
    await user.click(screen.getByRole("checkbox", { name: /Start breaks automatically/ }));
    await user.click(screen.getByRole("checkbox", { name: /Play a sound/ }));
    await user.click(screen.getByRole("checkbox", { name: /Show browser notifications/ }));

    expect(requestPermission).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      await screen.findByText(
        "New Focus Sessions use these defaults. An active session is unchanged.",
      ),
    ).toBeVisible();

    const [, init] = vi.mocked(fetch).mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      focusDurationMinutes: 50,
      breakDurationMinutes: 5,
      longBreakDurationMinutes: 20,
      focusSessionsBeforeLongBreak: 4,
      autoStartBreaks: true,
      autoStartFocusSessions: false,
      soundEnabled: true,
      browserNotificationsEnabled: true,
    });
  });

  it("keeps browser notifications off when permission is blocked", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("Notification", {
      permission: "denied",
      requestPermission: vi.fn(),
    });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, PREFERENCES));
    render(<FocusPreferencesPanel />, { wrapper: Wrapper });

    const notification = await screen.findByRole("checkbox", {
      name: /Show browser notifications/,
    });
    await user.click(notification);

    expect(notification).not.toBeChecked();
    expect(await screen.findByText(/Browser notifications are blocked/)).toBeVisible();
  });
});
