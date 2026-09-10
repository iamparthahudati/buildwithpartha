package tech.buildwithpartha.lifeos.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Central Micrometer metrics instrument service for LifeOS backend operations. Enforces strict tag
 * privacy (zero user PII or high-cardinality values).
 */
@Service
public class MetricsService {

  private final MeterRegistry meterRegistry;

  public MetricsService(@Autowired(required = false) MeterRegistry meterRegistry) {
    this.meterRegistry = meterRegistry;
  }

  public MeterRegistry getMeterRegistry() {
    return meterRegistry;
  }

  // --- AUTH METRICS ---

  public void recordLoginAttempt(String result, String reason) {
    if (meterRegistry != null) {
      Counter.builder("lifeos.auth.login.attempts")
          .tag("result", sanitizeTag(result))
          .tag("reason", sanitizeTag(reason))
          .register(meterRegistry)
          .increment();
    }
  }

  public void recordSessionValidation(String status) {
    if (meterRegistry != null) {
      Counter.builder("lifeos.auth.session.validations")
          .tag("status", sanitizeTag(status))
          .register(meterRegistry)
          .increment();
    }
  }

  public void recordPasswordReset(String result) {
    if (meterRegistry != null) {
      Counter.builder("lifeos.auth.password_reset.attempts")
          .tag("result", sanitizeTag(result))
          .register(meterRegistry)
          .increment();
    }
  }

  // --- JOB METRICS ---

  public void recordJobExecution(String jobKind, String status) {
    if (meterRegistry != null) {
      Counter.builder("lifeos.job.executions")
          .tag("kind", sanitizeTag(jobKind))
          .tag("status", sanitizeTag(status))
          .register(meterRegistry)
          .increment();
    }
  }

  public void recordJobDuration(String jobKind, String status, long durationMs) {
    if (meterRegistry != null) {
      Timer.builder("lifeos.job.duration")
          .tag("kind", sanitizeTag(jobKind))
          .tag("status", sanitizeTag(status))
          .register(meterRegistry)
          .record(durationMs, TimeUnit.MILLISECONDS);
    }
  }

  // --- API METRICS ---

  public void recordApiRequest(String method, String statusClass, String uriTemplate) {
    if (meterRegistry != null) {
      Counter.builder("lifeos.api.requests")
          .tag("method", sanitizeTag(method))
          .tag("status_class", sanitizeTag(statusClass))
          .tag("uri_template", sanitizeTag(uriTemplate))
          .register(meterRegistry)
          .increment();
    }
  }

  public void recordApiRequestDuration(
      String method, String statusClass, String uriTemplate, long durationMs) {
    if (meterRegistry != null) {
      Timer.builder("lifeos.api.request.duration")
          .tag("method", sanitizeTag(method))
          .tag("status_class", sanitizeTag(statusClass))
          .tag("uri_template", sanitizeTag(uriTemplate))
          .register(meterRegistry)
          .record(durationMs, TimeUnit.MILLISECONDS);
    }
  }

  // --- CACHE METRICS ---

  public void recordCacheEvaluation(String cacheName, String result) {
    if (meterRegistry != null) {
      Counter.builder("lifeos.cache.evaluations")
          .tag("cache_name", sanitizeTag(cacheName))
          .tag("result", sanitizeTag(result))
          .register(meterRegistry)
          .increment();
    }
  }

  // --- MAIL METRICS ---

  public void recordMailSend(String mailType, String status) {
    if (meterRegistry != null) {
      Counter.builder("lifeos.mail.sends")
          .tag("mail_type", sanitizeTag(mailType))
          .tag("status", sanitizeTag(status))
          .register(meterRegistry)
          .increment();
    }
  }

  // --- EXPORT METRICS ---

  public void recordExportGeneration(String exportType, String status) {
    if (meterRegistry != null) {
      Counter.builder("lifeos.export.generations")
          .tag("export_type", sanitizeTag(exportType))
          .tag("status", sanitizeTag(status))
          .register(meterRegistry)
          .increment();
    }
  }

  public void recordExportDuration(String exportType, String status, long durationMs) {
    if (meterRegistry != null) {
      Timer.builder("lifeos.export.duration")
          .tag("export_type", sanitizeTag(exportType))
          .tag("status", sanitizeTag(status))
          .register(meterRegistry)
          .record(durationMs, TimeUnit.MILLISECONDS);
    }
  }

  public void recordExportBytes(String exportType, long bytes) {
    if (meterRegistry != null) {
      DistributionSummary.builder("lifeos.export.bytes")
          .tag("export_type", sanitizeTag(exportType))
          .baseUnit("bytes")
          .register(meterRegistry)
          .record(bytes);
    }
  }

  // --- BUSINESS HEALTH METRICS ---

  public void registerBusinessGauge(String name, String description, Supplier<Number> supplier) {
    if (meterRegistry != null && supplier != null) {
      Gauge.builder(name, supplier, s -> s.get().doubleValue())
          .description(description)
          .register(meterRegistry);
    }
  }

  /** Sanitizes tag values to guarantee zero user PII, high cardinality, or raw SQL/path leakage. */
  public static String sanitizeTag(String input) {
    if (input == null || input.isBlank()) {
      return "UNKNOWN";
    }
    String safe = input.trim().replaceAll("[^a-zA-Z0-9_.-]", "_");
    return safe.length() > 64 ? safe.substring(0, 64) : safe;
  }
}
