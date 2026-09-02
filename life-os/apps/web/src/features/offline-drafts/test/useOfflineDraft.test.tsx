import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vitest } from "vitest";
import { useOfflineDraft } from "../hooks/useOfflineDraft";
import { readDraft, saveDraft } from "../model/draftStorage";

describe("useOfflineDraft hook (LOS-1312)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vitest.useFakeTimers();
  });

  it("returns initial data when no local draft exists", () => {
    const { result } = renderHook(() =>
      useOfflineDraft({
        userId: "user-1",
        draftKey: "note-new",
        initialData: { title: "Initial Title" },
      }),
    );

    expect(result.current.draftData).toEqual({ title: "Initial Title" });
    expect(result.current.hasLocalDraft).toBe(false);
    expect(result.current.lastSavedAt).toBeNull();
  });

  it("restores existing local draft from storage on mount", () => {
    saveDraft("user-1", "note-new", { title: "Saved Local Draft" });

    const { result } = renderHook(() =>
      useOfflineDraft({
        userId: "user-1",
        draftKey: "note-new",
        initialData: { title: "Initial Title" },
      }),
    );

    expect(result.current.draftData).toEqual({ title: "Saved Local Draft" });
    expect(result.current.hasLocalDraft).toBe(true);
    expect(result.current.lastSavedAt).not.toBeNull();
  });

  it("debounces saving updates to storage", () => {
    const { result } = renderHook(() =>
      useOfflineDraft({
        userId: "user-1",
        draftKey: "task-form",
        initialData: { text: "Hello" },
        debouncedMs: 500,
      }),
    );

    act(() => {
      result.current.setDraftData({ text: "Hello World" });
    });

    // Before timer fires
    expect(readDraft("user-1", "task-form")).toBeNull();

    // Advance timer past debounce delay
    act(() => {
      vitest.advanceTimersByTime(600);
    });

    const stored = readDraft<{ text: string }>("user-1", "task-form");
    expect(stored).not.toBeNull();
    expect(stored?.data).toEqual({ text: "Hello World" });
    expect(result.current.hasLocalDraft).toBe(true);
  });

  it("clears local draft on clearDraft", () => {
    saveDraft("user-1", "note-123", { body: "Text" });

    const { result } = renderHook(() =>
      useOfflineDraft({
        userId: "user-1",
        draftKey: "note-123",
        initialData: { body: "" },
      }),
    );

    expect(result.current.hasLocalDraft).toBe(true);

    act(() => {
      result.current.clearDraft();
    });

    expect(result.current.hasLocalDraft).toBe(false);
    expect(result.current.draftData).toEqual({ body: "" });
    expect(readDraft("user-1", "note-123")).toBeNull();
  });

  it("immediately saves with saveDraftNow", () => {
    const { result } = renderHook(() =>
      useOfflineDraft({
        userId: "user-1",
        draftKey: "quick-draft",
        initialData: "Draft content",
        debouncedMs: 5000,
      }),
    );

    act(() => {
      result.current.saveDraftNow("Immediate Save");
    });

    const stored = readDraft<string>("user-1", "quick-draft");
    expect(stored?.data).toBe("Immediate Save");
  });
});
