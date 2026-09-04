import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useServiceWorkerUpdate } from "../hooks/useServiceWorkerUpdate";
import * as registrationModule from "../model/serviceWorkerRegistration";

describe("useServiceWorkerUpdate (LOS-1315)", () => {
  const originalServiceWorker = navigator.serviceWorker;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: originalServiceWorker,
      writable: true,
      configurable: true,
    });
  });

  it("initializes with isUpdateAvailable false when no service worker is registered", async () => {
    vi.spyOn(registrationModule, "registerServiceWorker").mockResolvedValue(null);

    const { result } = renderHook(() => useServiceWorkerUpdate());

    expect(result.current.isUpdateAvailable).toBe(false);
    expect(result.current.registration).toBeNull();
  });

  it("detects waiting service worker on initial registration", async () => {
    const postMessageMock = vi.fn();
    const mockWaitingWorker = { postMessage: postMessageMock } as unknown as ServiceWorker;

    const mockRegistration = {
      waiting: mockWaitingWorker,
      addEventListener: vi.fn(),
    } as unknown as ServiceWorkerRegistration;

    vi.spyOn(registrationModule, "registerServiceWorker").mockResolvedValue(mockRegistration);

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        controller: {} as ServiceWorker,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    const onUpdateAvailableMock = vi.fn();
    const { result } = renderHook(() =>
      useServiceWorkerUpdate({ onUpdateAvailable: onUpdateAvailableMock }),
    );

    // Allow async register promise to resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isUpdateAvailable).toBe(true);
    expect(result.current.registration).toBe(mockRegistration);
    expect(onUpdateAvailableMock).toHaveBeenCalled();

    // Trigger update application
    act(() => {
      result.current.applyUpdate();
    });

    expect(postMessageMock).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });

  it("allows dismissing the update prompt", async () => {
    const mockRegistration = {
      waiting: {} as ServiceWorker,
      addEventListener: vi.fn(),
    } as unknown as ServiceWorkerRegistration;

    vi.spyOn(registrationModule, "registerServiceWorker").mockResolvedValue(mockRegistration);

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        controller: {} as ServiceWorker,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useServiceWorkerUpdate());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isUpdateAvailable).toBe(true);

    act(() => {
      result.current.dismissUpdate();
    });

    expect(result.current.isUpdateAvailable).toBe(false);
  });
});
