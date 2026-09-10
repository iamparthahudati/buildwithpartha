package tech.buildwithpartha.lifeos.common.metrics;

import static org.assertj.core.api.Assertions.assertThat;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MetricsContractTests {

  private MeterRegistry registry;
  private MetricsService metricsService;

  @BeforeEach
  void setUp() {
    registry = new SimpleMeterRegistry();
    metricsService = new MetricsService(registry);
  }

  @Test
  @DisplayName("records auth login attempt counter with sanitized tags")
  void recordsAuthLoginAttempts() {
    metricsService.recordLoginAttempt("SUCCESS", "NONE");
    metricsService.recordLoginAttempt("FAILURE", "INVALID_CREDENTIALS");

    Counter successCounter =
        registry.find("lifeos.auth.login.attempts").tag("result", "SUCCESS").counter();
    Counter failureCounter =
        registry.find("lifeos.auth.login.attempts").tag("result", "FAILURE").counter();

    assertThat(successCounter).isNotNull();
    assertThat(successCounter.count()).isEqualTo(1.0);
    assertThat(failureCounter).isNotNull();
    assertThat(failureCounter.count()).isEqualTo(1.0);
  }

  @Test
  @DisplayName("records session validation and password reset counters")
  void recordsAuthSessionAndReset() {
    metricsService.recordSessionValidation("VALID");
    metricsService.recordPasswordReset("SUCCESS");

    Counter sessionCounter =
        registry.find("lifeos.auth.session.validations").tag("status", "VALID").counter();
    Counter resetCounter =
        registry.find("lifeos.auth.password_reset.attempts").tag("result", "SUCCESS").counter();

    assertThat(sessionCounter.count()).isEqualTo(1.0);
    assertThat(resetCounter.count()).isEqualTo(1.0);
  }

  @Test
  @DisplayName("records job execution counter and duration timer")
  void recordsJobMetrics() {
    metricsService.recordJobExecution("RECURRENCE_GENERATION", "SUCCESS");
    metricsService.recordJobDuration("RECURRENCE_GENERATION", "SUCCESS", 150);

    Counter jobCounter =
        registry.find("lifeos.job.executions").tag("kind", "RECURRENCE_GENERATION").counter();
    Timer jobTimer =
        registry.find("lifeos.job.duration").tag("kind", "RECURRENCE_GENERATION").timer();

    assertThat(jobCounter.count()).isEqualTo(1.0);
    assertThat(jobTimer.count()).isEqualTo(1L);
    assertThat(jobTimer.totalTime(TimeUnit.MILLISECONDS)).isEqualTo(150.0);
  }

  @Test
  @DisplayName("records HTTP API request metrics")
  void recordsApiMetrics() {
    metricsService.recordApiRequest("GET", "2xx", "/life-os/api/v1/tasks");
    metricsService.recordApiRequestDuration("GET", "2xx", "/life-os/api/v1/tasks", 45);

    Counter apiCounter = registry.find("lifeos.api.requests").tag("status_class", "2xx").counter();
    Timer apiTimer =
        registry.find("lifeos.api.request.duration").tag("status_class", "2xx").timer();

    assertThat(apiCounter.count()).isEqualTo(1.0);
    assertThat(apiTimer.count()).isEqualTo(1L);
  }

  @Test
  @DisplayName("records cache, mail, and export metrics")
  void recordsCacheMailExportMetrics() {
    metricsService.recordCacheEvaluation("etag", "HIT");
    metricsService.recordMailSend("VERIFICATION", "SUCCESS");
    metricsService.recordExportGeneration("FULL_DATA_EXPORT", "SUCCESS");
    metricsService.recordExportDuration("FULL_DATA_EXPORT", "SUCCESS", 200);
    metricsService.recordExportBytes("FULL_DATA_EXPORT", 1024);

    Counter cacheCounter =
        registry.find("lifeos.cache.evaluations").tag("cache_name", "etag").counter();
    Counter mailCounter =
        registry.find("lifeos.mail.sends").tag("mail_type", "VERIFICATION").counter();
    Counter exportCounter =
        registry.find("lifeos.export.generations").tag("export_type", "FULL_DATA_EXPORT").counter();
    DistributionSummary summary =
        registry.find("lifeos.export.bytes").tag("export_type", "FULL_DATA_EXPORT").summary();

    assertThat(cacheCounter.count()).isEqualTo(1.0);
    assertThat(mailCounter.count()).isEqualTo(1.0);
    assertThat(exportCounter.count()).isEqualTo(1.0);
    assertThat(summary.totalAmount()).isEqualTo(1024.0);
  }

  @Test
  @DisplayName("registers business health gauges")
  void registersBusinessHealthGauges() {
    AtomicLong userCount = new AtomicLong(42);
    metricsService.registerBusinessGauge(
        "lifeos.business.users.total", "Total users", userCount::get);

    Gauge userGauge = registry.find("lifeos.business.users.total").gauge();
    assertThat(userGauge).isNotNull();
    assertThat(userGauge.value()).isEqualTo(42.0);

    userCount.set(43);
    assertThat(userGauge.value()).isEqualTo(43.0);
  }

  @Test
  @DisplayName("sanitizes tag values to prevent raw PII or high cardinality leakage")
  void sanitizesTagValues() {
    String sanitized = MetricsService.sanitizeTag("user@example.com <script>alert(1)</script>");
    assertThat(sanitized).doesNotContain("@", "<", ">", " ");
    assertThat(sanitized).isEqualTo("user_example.com__script_alert_1___script_");

    String nullSanitized = MetricsService.sanitizeTag(null);
    assertThat(nullSanitized).isEqualTo("UNKNOWN");
  }
}
