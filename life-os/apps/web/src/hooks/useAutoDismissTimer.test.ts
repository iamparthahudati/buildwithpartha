import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoDismissTimer } from "./useAutoDismissTimer";

describe("useAutoDismissTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("expires after the full duration when never paused", () => {
    const onExpire = vi.fn();
    renderHook(() => useAutoDismissTimer(1000, onExpire));

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(onExpire).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("never starts a timer for a persistent (null-duration) toast", () => {
    const onExpire = vi.fn();
    renderHook(() => useAutoDismissTimer(null, onExpire));

    act(() => {
      vi.advanceTimersByTime(1_000_000);
    });
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("stops counting while paused, rather than merely delaying the same full duration", () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useAutoDismissTimer(1000, onExpire));

    act(() => {
      vi.advanceTimersByTime(400);
      result.current.pause();
    });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    // A naive "clear and restart later" pause would still have fired by now.
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("resumes with only the time that was left, not a fresh full duration", () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useAutoDismissTimer(1000, onExpire));

    act(() => {
      vi.advanceTimersByTime(400);
      result.current.pause();
    });
    act(() => {
      result.current.resume();
      vi.advanceTimersByTime(599);
    });
    expect(onExpire).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("restarts at full length on a reset token change, even with the same duration", () => {
    const onExpire = vi.fn();
    const { result, rerender } = renderHook(
      ({ resetToken }) => useAutoDismissTimer(1000, onExpire, resetToken),
      { initialProps: { resetToken: 1 } },
    );

    act(() => {
      vi.advanceTimersByTime(900);
    });

    // A refreshed toast — same duration, new content — must not inherit the
    // 900ms already spent, or it would expire almost immediately.
    rerender({ resetToken: 2 });

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(onExpire).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);

    void result;
  });

  it("clears its timer on unmount, so it cannot fire after the toast is gone", () => {
    const onExpire = vi.fn();
    const { unmount } = renderHook(() => useAutoDismissTimer(1000, onExpire));

    unmount();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onExpire).not.toHaveBeenCalled();
  });
});
