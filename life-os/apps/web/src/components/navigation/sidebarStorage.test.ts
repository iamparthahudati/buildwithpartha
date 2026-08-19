import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  getStoredSidebarCollapsed,
  setStoredSidebarCollapsed,
} from "./sidebarStorage";

describe("sidebarStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("reads false when no item exists in localStorage", () => {
    expect(getStoredSidebarCollapsed()).toBe(false);
  });

  it("reads true when stored value is 'true'", () => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, "true");
    expect(getStoredSidebarCollapsed()).toBe(true);
  });

  it("reads false when stored value is 'false' or invalid", () => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, "false");
    expect(getStoredSidebarCollapsed()).toBe(false);

    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, "invalid");
    expect(getStoredSidebarCollapsed()).toBe(false);
  });

  it("persists true and false to localStorage", () => {
    setStoredSidebarCollapsed(true);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe("true");

    setStoredSidebarCollapsed(false);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe("false");
  });

  it("handles storage access exceptions gracefully", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(getStoredSidebarCollapsed()).toBe(false);
    expect(() => setStoredSidebarCollapsed(true)).not.toThrow();
  });
});
