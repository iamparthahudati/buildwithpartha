import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useDeepLinkParam } from "./useDeepLinkParam";

describe("useDeepLinkParam", () => {
  const originalUrl = window.location.href;

  beforeEach(() => {
    window.history.replaceState({}, "", "/life-os/tasks");
  });

  afterEach(() => {
    window.history.replaceState({}, "", originalUrl);
  });

  it("starts null when the URL carries no matching parameter", () => {
    const { result } = renderHook(() => useDeepLinkParam("task"));

    expect(result.current.value).toBeNull();
  });

  it("reads an already-present parameter on mount — a shared link reopening the same record", () => {
    window.history.replaceState({}, "", "/life-os/tasks?task=123");

    const { result } = renderHook(() => useDeepLinkParam("task"));

    expect(result.current.value).toBe("123");
  });

  it("pushes a real history entry and updates its own value when opened", () => {
    const { result } = renderHook(() => useDeepLinkParam("task"));

    act(() => {
      result.current.open("123");
    });

    expect(result.current.value).toBe("123");
    expect(window.location.search).toBe("?task=123");
  });

  it("leaves other query parameters untouched", () => {
    window.history.replaceState({}, "", "/life-os/tasks?view=board");
    const { result } = renderHook(() => useDeepLinkParam("task"));

    act(() => {
      result.current.open("123");
    });

    expect(window.location.search).toContain("view=board");
    expect(window.location.search).toContain("task=123");
  });

  it("closing steps back off the pushed entry rather than pushing a new one", async () => {
    const { result } = renderHook(() => useDeepLinkParam("task"));

    act(() => {
      result.current.open("123");
    });
    expect(window.location.search).toBe("?task=123");

    act(() => {
      result.current.close();
    });

    // history.back() resolves asynchronously, in jsdom as in a real browser.
    await waitFor(() => expect(result.current.value).toBeNull());
    expect(window.location.search).toBe("");
  });

  it("does nothing when asked to close while nothing is open", () => {
    const { result } = renderHook(() => useDeepLinkParam("task"));
    const before = window.location.href;

    act(() => {
      result.current.close();
    });

    expect(window.location.href).toBe(before);
  });

  it("updates its value when the browser's own Back button fires popstate", async () => {
    const { result } = renderHook(() => useDeepLinkParam("task"));

    act(() => {
      result.current.open("123");
    });
    expect(result.current.value).toBe("123");

    act(() => {
      window.history.back();
    });

    await waitFor(() => expect(result.current.value).toBeNull());
  });

  it("tracks a different parameter name independently", () => {
    window.history.replaceState({}, "", "/life-os/projects?project=456");

    const { result } = renderHook(() => useDeepLinkParam("project"));

    expect(result.current.value).toBe("456");
  });
});
