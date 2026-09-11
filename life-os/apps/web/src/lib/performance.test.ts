import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  captureNavigationTimings,
  createPerformanceMetric,
  evaluateMetric,
  formatMetricValue,
  observePerformanceMetrics,
  PERFORMANCE_BUDGETS,
} from "./performance";

describe("performance lib", () => {
  let originalPerformance: Performance;
  let originalPerformanceObserver: typeof PerformanceObserver | undefined;

  beforeEach(() => {
    originalPerformance = window.performance;
    originalPerformanceObserver = window.PerformanceObserver;
  });

  afterEach(() => {
    window.performance = originalPerformance;
    window.PerformanceObserver = originalPerformanceObserver as typeof PerformanceObserver;
    vi.restoreAllMocks();
  });

  it("evaluates metrics against predefined budget thresholds", () => {
    // LCP: good <= 1500, needs-improvement <= 2500, poor > 2500
    expect(evaluateMetric("LCP", 1200)).toBe("good");
    expect(evaluateMetric("LCP", 1500)).toBe("good");
    expect(evaluateMetric("LCP", 2000)).toBe("needs-improvement");
    expect(evaluateMetric("LCP", 3000)).toBe("poor");

    // INP: good <= 100, needs-improvement <= 200, poor > 200
    expect(evaluateMetric("INP", 50)).toBe("good");
    expect(evaluateMetric("INP", 100)).toBe("good");
    expect(evaluateMetric("INP", 150)).toBe("needs-improvement");
    expect(evaluateMetric("INP", 250)).toBe("poor");

    // CLS: good <= 0.05, needs-improvement <= 0.1, poor > 0.1
    expect(evaluateMetric("CLS", 0.02)).toBe("good");
    expect(evaluateMetric("CLS", 0.05)).toBe("good");
    expect(evaluateMetric("CLS", 0.08)).toBe("needs-improvement");
    expect(evaluateMetric("CLS", 0.15)).toBe("poor");

    // FCP & TTFB
    expect(evaluateMetric("FCP", 800)).toBe("good");
    expect(evaluateMetric("TTFB", 250)).toBe("good");

    // Unknown metric fallback
    expect(evaluateMetric("UNKNOWN" as any, 100)).toBe("good");
  });

  it("formats metric values with appropriate units", () => {
    expect(formatMetricValue("LCP", 1245.8)).toBe("1246 ms");
    expect(formatMetricValue("CLS", 0.0421)).toBe("0.042");
    expect(formatMetricValue("INP", 65.2)).toBe("65 ms");
    expect(formatMetricValue("UNKNOWN" as any, 50)).toBe("50 ms");
  });

  it("creates structured performance metric objects", () => {
    const metric = createPerformanceMetric("LCP", 1400);
    expect(metric.name).toBe("LCP");
    expect(metric.value).toBe(1400);
    expect(metric.rating).toBe("good");
    expect(metric.formatted).toBe("1400 ms");
    expect(metric.timestamp).toBeGreaterThan(0);
  });

  it("safely captures navigation timings when performance API returns entry", () => {
    const mockNavTiming = {
      domainLookupStart: 10,
      domainLookupEnd: 30,
      connectStart: 30,
      connectEnd: 60,
      requestStart: 60,
      responseStart: 150,
      responseEnd: 200,
      domInteractive: 350,
      domComplete: 500,
      loadEventEnd: 550,
      startTime: 0,
    };

    window.performance.getEntriesByType = vi.fn().mockReturnValue([mockNavTiming]);

    const timings = captureNavigationTimings();
    expect(timings).not.toBeNull();
    expect(timings?.dnsTimeMs).toBe(20);
    expect(timings?.tcpHandshakeMs).toBe(30);
    expect(timings?.ttfbMs).toBe(90);
    expect(timings?.downloadTimeMs).toBe(50);
    expect(timings?.domInteractiveMs).toBe(350);
    expect(timings?.domCompleteMs).toBe(500);
    expect(timings?.totalLoadTimeMs).toBe(550);
  });

  it("handles null navigation timings when getEntriesByType is empty", () => {
    window.performance.getEntriesByType = vi.fn().mockReturnValue([]);
    expect(captureNavigationTimings()).toBeNull();
  });

  it("attaches observers, processes metrics, and disconnects cleanly", () => {
    const callbacks: Array<(list: { getEntries: () => any[] }) => void> = [];
    const disconnectMocks: Array<() => void> = [];

    class MockPerformanceObserver {
      callback: (list: { getEntries: () => any[] }) => void;
      constructor(callback: (list: { getEntries: () => any[] }) => void) {
        this.callback = callback;
        callbacks.push(callback);
      }
      observe = vi.fn();
      disconnect = vi.fn(() => {
        disconnectMocks.push(this.disconnect);
      });
    }

    (window as any).PerformanceObserver = MockPerformanceObserver;

    const metricEvents: any[] = [];
    const cleanup = observePerformanceMetrics((metric) => {
      metricEvents.push(metric);
    });

    expect(typeof cleanup).toBe("function");

    // Simulate Paint callback
    if (callbacks[0]) {
      callbacks[0]({
        getEntries: () => [
          { name: "first-contentful-paint", startTime: 850 },
          { name: "other-paint", startTime: 200 },
        ],
      });
    }

    // Simulate LCP callback
    if (callbacks[1]) {
      callbacks[1]({
        getEntries: () => [{ startTime: 1200 }, { startTime: 1400 }],
      });
    }

    // Simulate CLS callback
    if (callbacks[2]) {
      callbacks[2]({
        getEntries: () => [
          { value: 0.02, hadRecentInput: false },
          { value: 0.05, hadRecentInput: true }, // Should be ignored
          { value: 0.01, hadRecentInput: false },
        ],
      });
    }

    expect(metricEvents.some((m) => m.name === "FCP" && m.value === 850)).toBe(true);
    expect(metricEvents.some((m) => m.name === "LCP" && m.value === 1400)).toBe(true);
    expect(metricEvents.some((m) => m.name === "CLS" && m.value === 0.03)).toBe(true);

    cleanup();
  });

  it("exposes canonical performance budget constants", () => {
    expect(PERFORMANCE_BUDGETS.LCP.good).toBe(1500);
    expect(PERFORMANCE_BUDGETS.INP.good).toBe(100);
    expect(PERFORMANCE_BUDGETS.CLS.good).toBe(0.05);
    expect(PERFORMANCE_BUDGETS.FCP.good).toBe(1000);
    expect(PERFORMANCE_BUDGETS.TTFB.good).toBe(400);
  });
});
