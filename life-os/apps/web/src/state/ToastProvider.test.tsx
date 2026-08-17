import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToastProvider } from "./ToastProvider";
import { useToast } from "./toastQueue";

function wrapper(maxVisible?: number) {
  return function Wrapper({ children }: { readonly children: React.ReactNode }) {
    return (
      <ToastProvider {...(maxVisible === undefined ? {} : { maxVisible })}>
        {children}
      </ToastProvider>
    );
  };
}

describe("useToast", () => {
  it("throws outside a ToastProvider, rather than doing nothing", () => {
    expect(() => renderHook(() => useToast())).toThrow(/ToastProvider/);
  });

  it("shows a pushed toast immediately", () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrapper() });

    act(() => {
      result.current.push({ tone: "success", message: "Task added." });
    });

    expect(result.current.visible).toHaveLength(1);
    expect(result.current.visible[0]?.message).toBe("Task added.");
  });

  it("dedupes an identical push by refreshing the existing entry in place", () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrapper() });

    act(() => {
      result.current.push({ tone: "danger", message: "Sync failed." });
      result.current.push({ tone: "danger", message: "Sync failed." });
    });

    expect(result.current.visible).toHaveLength(1);
  });

  it("dedupes by an explicit id even when the message text changes", () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrapper() });

    act(() => {
      result.current.push({ tone: "info", message: "Uploading…", id: "upload" });
      result.current.push({ tone: "success", message: "Uploaded.", id: "upload" });
    });

    expect(result.current.visible).toHaveLength(1);
    expect(result.current.visible[0]?.message).toBe("Uploaded.");
    expect(result.current.visible[0]?.tone).toBe("success");
  });

  it("does not dedupe two different messages that happen to share a tone", () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrapper() });

    act(() => {
      result.current.push({ tone: "info", message: "Task added." });
      result.current.push({ tone: "info", message: "Project archived." });
    });

    expect(result.current.visible).toHaveLength(2);
  });

  it("queues a toast past the visible cap and promotes it once a slot frees up", () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrapper(2) });

    let firstId = "";
    act(() => {
      firstId = result.current.push({ tone: "info", message: "First." });
      result.current.push({ tone: "info", message: "Second." });
      result.current.push({ tone: "info", message: "Third." });
    });

    expect(result.current.visible).toHaveLength(2);
    expect(result.current.pending).toHaveLength(1);
    expect(result.current.pending[0]?.message).toBe("Third.");

    act(() => {
      result.current.dismiss(firstId);
    });

    expect(result.current.visible.map((entry) => entry.message)).toEqual(["Second.", "Third."]);
    expect(result.current.pending).toHaveLength(0);
  });

  it("removes a toast on dismiss without promoting anything when nothing is waiting", () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrapper() });

    let id = "";
    act(() => {
      id = result.current.push({ tone: "success", message: "Changes saved." });
    });

    act(() => {
      result.current.dismiss(id);
    });

    expect(result.current.visible).toHaveLength(0);
  });

  it("returns the id it stored the entry under, so a caller can dismiss it by hand", () => {
    const { result } = renderHook(() => useToast(), { wrapper: wrapper() });

    let id = "";
    act(() => {
      id = result.current.push({ tone: "info", message: "Uploading…", id: "upload-1" });
    });

    expect(id).toBe("upload-1");
  });
});
