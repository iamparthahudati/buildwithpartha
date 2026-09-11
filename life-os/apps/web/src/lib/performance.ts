/**
 * LifeOS Performance Monitoring & Core Web Vitals (LOS-1510).
 *
 * Defines canonical Core Web Vitals (CWV) budgets, navigation timing capture,
 * and performance metric evaluation helpers across LCP, INP, CLS, FCP, and TTFB.
 */

export type MetricName = "LCP" | "INP" | "CLS" | "FCP" | "TTFB";
export type MetricRating = "good" | "needs-improvement" | "poor";

export interface MetricBudgetThreshold {
  readonly good: number;
  readonly needsImprovement: number;
  readonly unit: "ms" | "score";
}

export const PERFORMANCE_BUDGETS: Readonly<Record<MetricName, MetricBudgetThreshold>> =
  Object.freeze({
    LCP: { good: 1500, needsImprovement: 2500, unit: "ms" },
    INP: { good: 100, needsImprovement: 200, unit: "ms" },
    CLS: { good: 0.05, needsImprovement: 0.1, unit: "score" },
    FCP: { good: 1000, needsImprovement: 1800, unit: "ms" },
    TTFB: { good: 400, needsImprovement: 800, unit: "ms" },
  });

export interface PerformanceMetric {
  readonly name: MetricName;
  readonly value: number;
  readonly rating: MetricRating;
  readonly formatted: string;
  readonly delta?: number | undefined;
  readonly timestamp: number;
}

export interface NavigationTimingSummary {
  readonly dnsTimeMs: number;
  readonly tcpHandshakeMs: number;
  readonly ttfbMs: number;
  readonly downloadTimeMs: number;
  readonly domInteractiveMs: number;
  readonly domCompleteMs: number;
  readonly totalLoadTimeMs: number;
}

/**
 * Evaluates a metric value against LifeOS performance budgets.
 */
export function evaluateMetric(name: MetricName, value: number): MetricRating {
  const budget = PERFORMANCE_BUDGETS[name];
  if (!budget) {
    return "good";
  }
  if (value <= budget.good) {
    return "good";
  }
  if (value <= budget.needsImprovement) {
    return "needs-improvement";
  }
  return "poor";
}

/**
 * Formats a metric value with appropriate units.
 */
export function formatMetricValue(name: MetricName, value: number): string {
  const budget = PERFORMANCE_BUDGETS[name];
  if (budget?.unit === "score") {
    return value.toFixed(3);
  }
  return `${Math.round(value)} ms`;
}

/**
 * Creates a structured PerformanceMetric object.
 */
export function createPerformanceMetric(
  name: MetricName,
  value: number,
  delta?: number,
): PerformanceMetric {
  return {
    name,
    value,
    rating: evaluateMetric(name, value),
    formatted: formatMetricValue(name, value),
    delta,
    timestamp: Date.now(),
  };
}

/**
 * Safely extracts navigation timings from the Performance API.
 */
export function captureNavigationTimings(): NavigationTimingSummary | null {
  if (typeof window === "undefined" || !window.performance) {
    return null;
  }

  const entries = window.performance.getEntriesByType?.("navigation");
  if (!entries || entries.length === 0) {
    return null;
  }

  const nav = entries[0] as PerformanceNavigationTiming;
  if (!nav) {
    return null;
  }

  return {
    dnsTimeMs: Math.max(0, Math.round(nav.domainLookupEnd - nav.domainLookupStart)),
    tcpHandshakeMs: Math.max(0, Math.round(nav.connectEnd - nav.connectStart)),
    ttfbMs: Math.max(0, Math.round(nav.responseStart - nav.requestStart)),
    downloadTimeMs: Math.max(0, Math.round(nav.responseEnd - nav.responseStart)),
    domInteractiveMs: Math.max(0, Math.round(nav.domInteractive)),
    domCompleteMs: Math.max(0, Math.round(nav.domComplete)),
    totalLoadTimeMs: Math.max(0, Math.round(nav.loadEventEnd - nav.startTime)),
  };
}

/**
 * Attaches PerformanceObservers to capture Core Web Vitals.
 * Returns an unmount / disconnect cleanup function.
 */
export function observePerformanceMetrics(
  onMetric: (metric: PerformanceMetric) => void,
): () => void {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
    return () => {};
  }

  const observers: PerformanceObserver[] = [];

  // Observe Paint metrics (FCP)
  try {
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          onMetric(createPerformanceMetric("FCP", entry.startTime));
        }
      }
    });
    paintObserver.observe({ type: "paint", buffered: true });
    observers.push(paintObserver);
  } catch {
    // Unsupported entry type in current browser
  }

  // Observe Largest Contentful Paint (LCP)
  try {
    let largestLcpValue = 0;
    const lcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.startTime > largestLcpValue) {
          largestLcpValue = entry.startTime;
          onMetric(createPerformanceMetric("LCP", largestLcpValue));
        }
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    observers.push(lcpObserver);
  } catch {
    // Unsupported
  }

  // Observe Cumulative Layout Shift (CLS)
  try {
    let cumulativeClsScore = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
        };
        if (!layoutShift.hadRecentInput && typeof layoutShift.value === "number") {
          cumulativeClsScore += layoutShift.value;
          onMetric(createPerformanceMetric("CLS", cumulativeClsScore, layoutShift.value));
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
    observers.push(clsObserver);
  } catch {
    // Unsupported
  }

  return () => {
    for (const observer of observers) {
      try {
        observer.disconnect();
      } catch {
        // Safe ignore
      }
    }
  };
}
