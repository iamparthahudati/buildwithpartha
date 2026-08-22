import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiRequest, configureApiClient, resetApiClientConfiguration } from "./apiClient";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function problemResponse(status: number, code: string): Response {
  return jsonResponse(status, {
    type: "https://buildwithpartha.tech/life-os/problems/v1/example",
    title: "Example failure",
    status,
    detail: "Example detail.",
    instance: "/life-os/api/v1/example",
    code,
    correlationId: "11111111-1111-4111-8111-111111111111",
    errors: [],
  });
}

describe("apiRequest", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("requests the configured API base path with same-origin credentials", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await apiRequest("/auth/session-probe");

    expect(fetch).toHaveBeenCalledWith(
      "/life-os/api/v1/auth/session-probe",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
  });

  it("resolves with the parsed JSON body on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(202, { status: "PENDING_VERIFICATION" }));

    const body = await apiRequest<{ status: string }>("/auth/signup", {
      method: "POST",
      body: { email: "person@example.test" },
    });

    expect(body).toEqual({ status: "PENDING_VERIFICATION" });
  });

  it("never attaches a CSRF header to a GET request even when a token is known", async () => {
    configureApiClient({ getCsrfToken: () => "known-token", onAuthenticationRequired: vi.fn() });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, {}));

    await apiRequest("/tasks");

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).has("X-CSRF-TOKEN")).toBe(false);
  });

  it("attaches the current CSRF token to a mutating request once one is known", async () => {
    configureApiClient({ getCsrfToken: () => "known-token", onAuthenticationRequired: vi.fn() });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, {}));

    await apiRequest("/tasks", { method: "POST", body: { title: "Example" } });

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).get("X-CSRF-TOKEN")).toBe("known-token");
  });

  it("omits the CSRF header on a mutating request before any token is known", async () => {
    configureApiClient({ getCsrfToken: () => null, onAuthenticationRequired: vi.fn() });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(202, {}));

    await apiRequest("/auth/signup", { method: "POST", body: {} });

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).has("X-CSRF-TOKEN")).toBe(false);
  });

  it("carries no CSRF header at all when the client was never configured", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, {}));

    await apiRequest("/tasks", { method: "POST", body: {} });

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).has("X-CSRF-TOKEN")).toBe(false);
  });

  it("rejects with an ApiError carrying the parsed problem on failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(400, "VALIDATION_FAILED"));

    const failure = await apiRequest("/auth/signup", { method: "POST", body: {} }).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(400);
    expect((failure as ApiError).problem?.code).toBe("VALIDATION_FAILED");
  });

  it("reports 401 AUTHENTICATION_REQUIRED through onAuthenticationRequired", async () => {
    const onAuthenticationRequired = vi.fn();
    configureApiClient({ getCsrfToken: () => null, onAuthenticationRequired });
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(401, "AUTHENTICATION_REQUIRED"));

    await expect(apiRequest("/tasks")).rejects.toBeInstanceOf(ApiError);

    expect(onAuthenticationRequired).toHaveBeenCalledTimes(1);
  });

  it("does not treat a login failure's 401 INVALID_CREDENTIALS as a lost session", async () => {
    const onAuthenticationRequired = vi.fn();
    configureApiClient({ getCsrfToken: () => null, onAuthenticationRequired });
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(401, "INVALID_CREDENTIALS"));

    await expect(apiRequest("/auth/login", { method: "POST", body: {} })).rejects.toBeInstanceOf(
      ApiError,
    );

    expect(onAuthenticationRequired).not.toHaveBeenCalled();
  });

  it("does not report a non-401 failure as an authentication requirement", async () => {
    const onAuthenticationRequired = vi.fn();
    configureApiClient({ getCsrfToken: () => null, onAuthenticationRequired });
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(429, "RATE_LIMITED"));

    await expect(apiRequest("/auth/signup", { method: "POST", body: {} })).rejects.toBeInstanceOf(
      ApiError,
    );

    expect(onAuthenticationRequired).not.toHaveBeenCalled();
  });

  it("never reads or writes localStorage or sessionStorage", async () => {
    const localStorageSetItem = vi.spyOn(Storage.prototype, "setItem");
    configureApiClient({ getCsrfToken: () => "token", onAuthenticationRequired: vi.fn() });
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(401, "AUTHENTICATION_REQUIRED"));

    await expect(apiRequest("/tasks", { method: "POST", body: {} })).rejects.toBeInstanceOf(
      ApiError,
    );

    expect(localStorageSetItem).not.toHaveBeenCalled();
    localStorageSetItem.mockRestore();
  });
});
