import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMediaQuery } from "./useMediaQuery";

interface FakeMediaQueryList {
  matches: boolean;
  readonly media: string;
  readonly listeners: Set<(event: MediaQueryListEvent) => void>;
  addEventListener: (type: "change", listener: (event: MediaQueryListEvent) => void) => void;
  removeEventListener: (type: "change", listener: (event: MediaQueryListEvent) => void) => void;
}

function installFakeMatchMedia(initialMatches: boolean) {
  const lists = new Map<string, FakeMediaQueryList>();

  const matchMedia = vi.fn((query: string): FakeMediaQueryList => {
    let list = lists.get(query);
    if (!list) {
      list = {
        matches: initialMatches,
        media: query,
        listeners: new Set(),
        addEventListener: (_type, listener) => list?.listeners.add(listener),
        removeEventListener: (_type, listener) => list?.listeners.delete(listener),
      };
      lists.set(query, list);
    }
    return list;
  });

  vi.stubGlobal("matchMedia", matchMedia);

  return {
    fire(query: string, matches: boolean) {
      const list = lists.get(query);
      if (!list) throw new Error(`No listener registered for query: ${query}`);
      list.matches = matches;
      for (const listener of list.listeners) {
        listener({ matches } as MediaQueryListEvent);
      }
    },
  };
}

describe("useMediaQuery", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the current match state from matchMedia", () => {
    installFakeMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(result.current).toBe(true);
  });

  it("updates when the media query's match state changes", () => {
    const fake = installFakeMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(result.current).toBe(false);

    act(() => {
      fake.fire("(max-width: 767px)", true);
    });
    expect(result.current).toBe(true);
  });

  it("removes its listener on unmount", () => {
    installFakeMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(() => unmount()).not.toThrow();
  });
});
