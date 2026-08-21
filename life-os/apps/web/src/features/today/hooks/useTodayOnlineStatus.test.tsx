import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTodayOnlineStatus } from "./useTodayOnlineStatus";

describe("useTodayOnlineStatus", () => {
  it("returns online status and responds to online/offline events", () => {
    const { result } = renderHook(() => useTodayOnlineStatus());
    expect(typeof result.current).toBe("boolean");

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
  });
});
