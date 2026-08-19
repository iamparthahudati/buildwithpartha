import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetApiClientConfiguration } from "@lib/apiClient";

import { login, logout, logoutAll, resendVerification, signup, verifyEmail } from "./authApi";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("authApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("posts to /auth/signup with the exact SignupRequest shape", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(202, { status: "PENDING_VERIFICATION" }));

    const response = await signup({
      email: "person@example.test",
      password: "correct-horse-battery-staple",
      displayName: "Person",
      termsVersion: "2026-08-01",
      privacyVersion: "2026-08-01",
    });

    expect(response).toEqual({ status: "PENDING_VERIFICATION" });
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/auth/signup");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "person@example.test",
      password: "correct-horse-battery-staple",
      displayName: "Person",
      termsVersion: "2026-08-01",
      privacyVersion: "2026-08-01",
    });
  });

  it("posts to /auth/verify-email with the raw token", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { status: "VERIFIED" }));

    const response = await verifyEmail({ token: "raw-token-value" });

    expect(response).toEqual({ status: "VERIFIED" });
    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/auth/verify-email");
  });

  it("posts to /auth/resend-verification with the email", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(202, { status: "PENDING_VERIFICATION" }));

    const response = await resendVerification({ email: "person@example.test" });

    expect(response).toEqual({ status: "PENDING_VERIFICATION" });
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/auth/resend-verification");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ email: "person@example.test" });
  });

  it("posts to /auth/login and returns the safe user fields plus the CSRF bootstrap", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        id: "00000000-0000-4000-8000-000000000001",
        email: "person@example.test",
        displayName: "Person",
        timeZone: "Asia/Kolkata",
        locale: "en-IN",
        weekStart: 1,
        csrfToken: "issued-csrf-token",
      }),
    );

    const response = await login({ email: "person@example.test", password: "secret" });

    expect(response.csrfToken).toBe("issued-csrf-token");
    expect(response.id).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("posts to /auth/logout with no body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { status: "LOGGED_OUT" }));

    const response = await logout();

    expect(response).toEqual({ status: "LOGGED_OUT" });
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/auth/logout");
    expect(init.body).toBeUndefined();
  });

  it("posts to /auth/logout-all", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { status: "LOGGED_OUT" }));

    await logoutAll();

    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/auth/logout-all");
  });
});
