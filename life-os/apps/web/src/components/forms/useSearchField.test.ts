import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSearchField } from "./useSearchField";

describe("useSearchField", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("searches after a quiet pause in debounced mode", () => {
    const onSearch = vi.fn();
    renderHook(({ value }) => useSearchField(value, { debounceMs: 300, onSearch }), {
      initialProps: { value: "task" },
    });

    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledWith("task");
  });

  it("restarts the pause on every keystroke rather than firing per character", () => {
    const onSearch = vi.fn();
    const { rerender } = renderHook(
      ({ value }) => useSearchField(value, { debounceMs: 300, onSearch }),
      {
        initialProps: { value: "t" },
      },
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: "ta" });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: "tas" });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // 600ms have passed but no single 300ms gap without a keystroke has.
    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("tas");
  });

  it("never searches on its own in submit mode", () => {
    const onSearch = vi.fn();
    renderHook(({ value }) => useSearchField(value, { mode: "submit", onSearch }), {
      initialProps: { value: "task" },
    });

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(onSearch).not.toHaveBeenCalled();
  });

  it("submits immediately and cancels a pending debounce", () => {
    const onSearch = vi.fn();
    const { result } = renderHook(
      ({ value }) => useSearchField(value, { debounceMs: 300, onSearch }),
      {
        initialProps: { value: "task" },
      },
    );

    act(() => {
      result.current.submit();
    });
    expect(onSearch).toHaveBeenCalledTimes(1);

    // The debounce that was already ticking must not fire a second time.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("submits on Enter in either mode", () => {
    const onSearch = vi.fn();
    const { result } = renderHook(
      ({ value }) => useSearchField(value, { mode: "submit", onSearch }),
      {
        initialProps: { value: "task" },
      },
    );

    act(() => {
      result.current.fieldProps.onKeyDown({ key: "Enter" } as never);
    });

    expect(onSearch).toHaveBeenCalledWith("task");
  });

  it("ignores a key other than Enter", () => {
    const onSearch = vi.fn();
    const { result } = renderHook(
      ({ value }) => useSearchField(value, { mode: "submit", onSearch }),
      {
        initialProps: { value: "task" },
      },
    );

    act(() => {
      result.current.fieldProps.onKeyDown({ key: "a" } as never);
    });

    expect(onSearch).not.toHaveBeenCalled();
  });

  it("holds a search until IME composition ends, rather than searching an intermediate character", () => {
    const onSearch = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) => useSearchField(value, { debounceMs: 300, onSearch }),
      { initialProps: { value: "" } },
    );

    act(() => {
      result.current.fieldProps.onCompositionStart();
    });
    // The browser reports intermediate composed characters through `value`
    // while composing; none of them should ever reach onSearch.
    rerender({ value: "ｋ" });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      result.current.fieldProps.onCompositionEnd({} as never);
    });
    // The committed value arrives as one more change once composition ends.
    rerender({ value: "task" });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("task");
  });

  it("cancels a pending search on unmount instead of firing into a gone component", () => {
    const onSearch = vi.fn();
    const { unmount } = renderHook(
      ({ value }) => useSearchField(value, { debounceMs: 300, onSearch }),
      {
        initialProps: { value: "task" },
      },
    );

    unmount();

    expect(() => {
      vi.advanceTimersByTime(300);
    }).not.toThrow();
    expect(onSearch).not.toHaveBeenCalled();
  });
});
