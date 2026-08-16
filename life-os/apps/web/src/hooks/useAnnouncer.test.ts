import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAnnouncer } from "./useAnnouncer";

describe("useAnnouncer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("publishes the first message immediately", () => {
    const { result } = renderHook(() => useAnnouncer(500));

    act(() => {
      result.current.announce("Task saved");
    });

    expect(result.current.message).toBe("Task saved");
  });

  it("holds a burst and announces only where it ended up", () => {
    const { result } = renderHook(() => useAnnouncer(500));

    act(() => {
      result.current.announce("1 filter applied");
      result.current.announce("2 filters applied");
      result.current.announce("3 filters applied");
    });

    // The user hears the first state and then the final one — not every step
    // between, which is what makes a live region unusable.
    expect(result.current.message).toBe("1 filter applied");

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.message).toBe("3 filters applied");
  });

  it("keeps throttling while messages keep arriving", () => {
    const { result } = renderHook(() => useAnnouncer(500));

    act(() => {
      result.current.announce("Focus 00:01");
      result.current.announce("Focus 00:02");
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.message).toBe("Focus 00:02");

    // A second burst inside the reopened window is held in the same way.
    act(() => {
      result.current.announce("Focus 00:03");
      result.current.announce("Focus 00:04");
    });
    expect(result.current.message).toBe("Focus 00:02");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.message).toBe("Focus 00:04");
  });

  it("announces again once the window has closed quietly", () => {
    const { result } = renderHook(() => useAnnouncer(500));

    act(() => {
      result.current.announce("Task saved");
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      result.current.announce("Task deleted");
    });

    expect(result.current.message).toBe("Task deleted");
  });

  it("empties the region when the work it described is over", () => {
    const { result } = renderHook(() => useAnnouncer(500));

    act(() => {
      result.current.announce("Saving changes…");
      result.current.clear();
    });

    expect(result.current.message).toBe("");

    // A held message must not resurface after a clear.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.message).toBe("");
  });

  it("does not fire a held message after unmount", () => {
    const { result, unmount } = renderHook(() => useAnnouncer(500));

    act(() => {
      result.current.announce("Saving changes…");
      result.current.announce("Saved");
    });
    unmount();

    expect(() => {
      vi.advanceTimersByTime(1000);
    }).not.toThrow();
  });
});
