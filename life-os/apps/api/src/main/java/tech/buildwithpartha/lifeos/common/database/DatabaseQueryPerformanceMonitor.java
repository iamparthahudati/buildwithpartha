package tech.buildwithpartha.lifeos.common.database;

import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.metrics.MetricsService;

/**
 * Monitors database query execution performance, evaluates against regression thresholds (500ms
 * warning threshold), logs slow query warnings, and records Micrometer database metrics.
 */
@Component
public class DatabaseQueryPerformanceMonitor {

  private static final Logger log = LoggerFactory.getLogger(DatabaseQueryPerformanceMonitor.class);
  public static final long SLOW_QUERY_THRESHOLD_MS = 500L;

  private final MetricsService metricsService;
  private final AtomicLong slowQueryCounter = new AtomicLong(0);

  public DatabaseQueryPerformanceMonitor(MetricsService metricsService) {
    this.metricsService = metricsService;
  }

  public long recordQueryExecution(String queryType, long durationMs) {
    boolean isSlow = durationMs >= SLOW_QUERY_THRESHOLD_MS;
    if (isSlow) {
      slowQueryCounter.incrementAndGet();
      log.warn(
          "Database query performance regression warning: operation '{}' took {} ms"
              + " (threshold: {} ms)",
          queryType,
          durationMs,
          SLOW_QUERY_THRESHOLD_MS);
    } else {
      log.debug("Database query operation '{}' completed in {} ms", queryType, durationMs);
    }

    if (metricsService != null) {
      metricsService.recordDatabaseQueryDuration(queryType, durationMs, isSlow);
    }

    return durationMs;
  }

  public long getSlowQueryCount() {
    return slowQueryCounter.get();
  }

  public void resetSlowQueryCount() {
    slowQueryCounter.set(0);
  }
}
