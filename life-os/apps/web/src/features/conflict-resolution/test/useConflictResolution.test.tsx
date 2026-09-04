import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useConflictResolution } from "../hooks/useConflictResolution";

describe("useConflictResolution hook", () => {
  it("initializes with closed state and null details", () => {
    const { result } = renderHook(() => useConflictResolution());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.details).toBeNull();
  });

  it("opens conflict dialog with details", () => {
    const { result } = renderHook(() => useConflictResolution());
    const mockDetails = {
      localPayload: { title: "Draft Task" },
      serverPayload: { title: "Server Task" },
      conflictTimestamp: "2026-09-05T01:00:00Z",
    };

    act(() => {
      result.current.openConflict(mockDetails);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.details).toEqual(mockDetails);
  });

  it("handles copy local draft action", async () => {
    const onCopySuccess = vi.fn();
    const { result } = renderHook(() => useConflictResolution({ onCopySuccess }));

    act(() => {
      result.current.openConflict({
        localPayload: { title: "Draft Task" },
        conflictTimestamp: "2026-09-05T01:00:00Z",
      });
    });

    await act(async () => {
      await result.current.copyLocalDraft();
    });

    expect(result.current.hasCopied).toBe(true);
    expect(onCopySuccess).toHaveBeenCalledTimes(1);
  });

  it("triggers resolve handlers on choices", () => {
    const onUseServer = vi.fn();
    const onOverwriteLocal = vi.fn();

    const { result } = renderHook(() => useConflictResolution({ onUseServer, onOverwriteLocal }));

    act(() => {
      result.current.openConflict({
        localPayload: { title: "Draft Task" },
        conflictTimestamp: "2026-09-05T01:00:00Z",
      });
    });

    act(() => {
      result.current.resolveUseServer();
    });
    expect(onUseServer).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.openConflict({
        localPayload: { title: "Draft Task" },
        conflictTimestamp: "2026-09-05T01:00:00Z",
      });
    });

    act(() => {
      result.current.resolveOverwriteLocal();
    });
    expect(onOverwriteLocal).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
  });
});
