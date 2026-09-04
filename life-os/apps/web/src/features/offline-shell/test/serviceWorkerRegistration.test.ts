import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearShellCaches,
  registerServiceWorker,
  unregisterServiceWorker,
} from "../model/serviceWorkerRegistration";

describe("serviceWorkerRegistration (LOS-1315)", () => {
  const originalServiceWorker = navigator.serviceWorker;
  const originalCaches = window.caches;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: originalServiceWorker,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "caches", {
      value: originalCaches,
      writable: true,
      configurable: true,
    });
  });

  describe("registerServiceWorker", () => {
    it("returns null if navigator.serviceWorker is undefined", async () => {
      Object.defineProperty(navigator, "serviceWorker", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = await registerServiceWorker();
      expect(result).toBeNull();
    });

    it("registers service worker with default scriptUrl and scope", async () => {
      const mockRegistration = {
        addEventListener: vi.fn(),
      } as unknown as ServiceWorkerRegistration;

      const registerMock = vi.fn().mockResolvedValue(mockRegistration);
      Object.defineProperty(navigator, "serviceWorker", {
        value: { register: registerMock },
        writable: true,
        configurable: true,
      });

      const result = await registerServiceWorker();
      expect(registerMock).toHaveBeenCalledWith("/life-os/sw.js", { scope: "/life-os/" });
      expect(result).toBe(mockRegistration);
    });

    it("registers service worker with custom options and triggers onUpdateFound listener", async () => {
      let updateFoundCallback: (() => void) | undefined;

      const mockRegistration = {
        addEventListener: vi.fn((event, callback) => {
          if (event === "updatefound") {
            updateFoundCallback = callback as () => void;
          }
        }),
      } as unknown as ServiceWorkerRegistration;

      const registerMock = vi.fn().mockResolvedValue(mockRegistration);
      Object.defineProperty(navigator, "serviceWorker", {
        value: { register: registerMock },
        writable: true,
        configurable: true,
      });

      const onUpdateFoundMock = vi.fn();
      await registerServiceWorker({
        scriptUrl: "/custom-sw.js",
        scope: "/custom-scope/",
        onUpdateFound: onUpdateFoundMock,
      });

      expect(registerMock).toHaveBeenCalledWith("/custom-sw.js", { scope: "/custom-scope/" });
      expect(updateFoundCallback).toBeDefined();

      updateFoundCallback?.();
      expect(onUpdateFoundMock).toHaveBeenCalledWith(mockRegistration);
    });

    it("handles registration rejection gracefully and returns null", async () => {
      const registerMock = vi.fn().mockRejectedValue(new Error("Registration failed"));
      Object.defineProperty(navigator, "serviceWorker", {
        value: { register: registerMock },
        writable: true,
        configurable: true,
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = await registerServiceWorker();

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        "Service worker registration failed:",
        expect.any(Error),
      );
    });
  });

  describe("unregisterServiceWorker", () => {
    it("returns false if navigator.serviceWorker is undefined", async () => {
      Object.defineProperty(navigator, "serviceWorker", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = await unregisterServiceWorker();
      expect(result).toBe(false);
    });

    it("unregisters active service workers and returns true if any succeeded", async () => {
      const mockReg1 = { unregister: vi.fn().mockResolvedValue(true) };
      const mockReg2 = { unregister: vi.fn().mockResolvedValue(false) };

      Object.defineProperty(navigator, "serviceWorker", {
        value: {
          getRegistrations: vi.fn().mockResolvedValue([mockReg1, mockReg2]),
        },
        writable: true,
        configurable: true,
      });

      const result = await unregisterServiceWorker();
      expect(mockReg1.unregister).toHaveBeenCalled();
      expect(mockReg2.unregister).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe("clearShellCaches", () => {
    it("returns false if window.caches is undefined", async () => {
      Object.defineProperty(window, "caches", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = await clearShellCaches();
      expect(result).toBe(false);
    });

    it("deletes only caches matching lifeos-shell- prefix", async () => {
      const deleteMock = vi.fn().mockResolvedValue(true);
      const keysMock = vi
        .fn()
        .mockResolvedValue(["lifeos-shell-v1", "user-data-cache", "lifeos-shell-v2"]);

      Object.defineProperty(window, "caches", {
        value: {
          keys: keysMock,
          delete: deleteMock,
        },
        writable: true,
        configurable: true,
      });

      const result = await clearShellCaches();
      expect(deleteMock).toHaveBeenCalledWith("lifeos-shell-v1");
      expect(deleteMock).toHaveBeenCalledWith("lifeos-shell-v2");
      expect(deleteMock).not.toHaveBeenCalledWith("user-data-cache");
      expect(result).toBe(true);
    });
  });
});
