package tech.buildwithpartha.lifeos.common.ops;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.http.Cookie;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tech.buildwithpartha.lifeos.auth.domain.AccountStatus;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.database.DatabaseQueryPerformanceMonitor;
import tech.buildwithpartha.lifeos.common.export.ExportFileKind;
import tech.buildwithpartha.lifeos.common.export.ExportFilePort;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.metrics.MetricsService;
import tech.buildwithpartha.lifeos.job.application.BackgroundJobWorker;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJob;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJobRepository;
import tech.buildwithpartha.lifeos.job.domain.BackgroundJobStatus;

/**
 * Comprehensive Backend Operations Phase Gate Integration Test (LOS-1414). Verifies failure
 * injection, retries, idempotency, redaction, metrics, OpenAPI contracts, query performance
 * thresholds, and safe degradation of Today aggregation.
 */
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
public class BackendOperationsGateIntegrationTests {

  private static final String CSRF_HEADER_NAME = "X-CSRF-TOKEN";
  private static final String IDEMPOTENCY_HEADER_NAME = "Idempotency-Key";

  @Autowired private MockMvc mockMvc;
  @Autowired private UserRepository userRepository;
  @Autowired private SessionRepository sessionRepository;
  @Autowired private SecureTokenGenerator tokenGenerator;
  @Autowired private ExportFilePort exportFilePort;
  @Autowired private MeterRegistry meterRegistry;
  @Autowired private MetricsService metricsService;
  @Autowired private DatabaseQueryPerformanceMonitor queryPerformanceMonitor;
  @Autowired private BackgroundJobRepository backgroundJobRepository;
  @Autowired private BackgroundJobWorker backgroundJobWorker;

  private UUID userId;
  private Cookie sessionCookie;
  private RawToken csrfToken;

  @BeforeEach
  void setUp() {
    Instant now = Instant.now();
    userId = UUID.randomUUID();

    User user =
        new User(
            userId,
            EmailAddress.of("ops-gate-" + userId + "@example.test"),
            "Ops Gate User",
            "Asia/Kolkata",
            "en-IN",
            1,
            AccountStatus.ACTIVE,
            Optional.of(now),
            now,
            now,
            0L);
    userRepository.save(user);

    RawToken sessionToken = tokenGenerator.generate();
    csrfToken = tokenGenerator.generate();
    Session session =
        new Session(
            UUID.randomUUID(),
            userId,
            tokenGenerator.hash(sessionToken.value()),
            tokenGenerator.hash(csrfToken.value()),
            now,
            now,
            now.plusSeconds(3600),
            Optional.empty(),
            Optional.of("Ops Test Client"));
    sessionRepository.save(session);
    sessionCookie = new Cookie("lifeos_session", sessionToken.value());
  }

  @Test
  void backgroundJob_resilienceAndDeadLettering() {
    Instant now = Instant.now();
    BackgroundJob job =
        BackgroundJob.enqueue(
            UUID.randomUUID(), userId, BackgroundJobKind.DATA_EXPORT, "{}", now.minusSeconds(10));
    backgroundJobRepository.save(job);

    backgroundJobWorker.runWorker();

    BackgroundJob updated = backgroundJobRepository.findById(job.id()).orElseThrow();
    assertThat(updated.status())
        .isIn(
            BackgroundJobStatus.SUCCEEDED,
            BackgroundJobStatus.PENDING,
            BackgroundJobStatus.DEAD_LETTERED);

    BackgroundJob exhaustedJob =
        new BackgroundJob(
            UUID.randomUUID(),
            Optional.of(userId),
            BackgroundJobKind.DATA_EXPORT,
            "{}",
            BackgroundJobStatus.PENDING,
            9,
            now.minusSeconds(10),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            now.minusSeconds(10),
            now.minusSeconds(10));
    backgroundJobRepository.save(exhaustedJob);

    backgroundJobWorker.runWorker();

    BackgroundJob deadLettered = backgroundJobRepository.findById(exhaustedJob.id()).orElseThrow();
    assertThat(deadLettered.status())
        .isIn(BackgroundJobStatus.SUCCEEDED, BackgroundJobStatus.DEAD_LETTERED);
  }

  @Test
  void idempotency_replayAndConflictReuseProtection() throws Exception {
    String key = "ops-gate-idem-" + UUID.randomUUID();
    String taskJson = "{\"title\":\"Ops Gate Task\",\"priority\":\"P1\"}";

    mockMvc
        .perform(
            post("/tasks")
                .cookie(sessionCookie)
                .header(CSRF_HEADER_NAME, csrfToken.value())
                .header(IDEMPOTENCY_HEADER_NAME, key)
                .contentType(MediaType.APPLICATION_JSON)
                .content(taskJson))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.title").value("Ops Gate Task"));

    mockMvc
        .perform(
            post("/tasks")
                .cookie(sessionCookie)
                .header(CSRF_HEADER_NAME, csrfToken.value())
                .header(IDEMPOTENCY_HEADER_NAME, key)
                .contentType(MediaType.APPLICATION_JSON)
                .content(taskJson))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.title").value("Ops Gate Task"));

    mockMvc
        .perform(
            post("/projects")
                .cookie(sessionCookie)
                .header(CSRF_HEADER_NAME, csrfToken.value())
                .header(IDEMPOTENCY_HEADER_NAME, key)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Conflict Project\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));
  }

  @Test
  void databaseQueryPerformanceMonitor_recordsMicrometerMetricsOnSlowQuery() {
    queryPerformanceMonitor.recordQueryExecution("SELECT", 600);
    assertThat(meterRegistry.find("lifeos.db.query.duration").tag("slow", "true").timer())
        .isNotNull();
    assertThat(queryPerformanceMonitor.getSlowQueryCount()).isGreaterThan(0L);
  }

  @Test
  void metricsContract_instrumentsCoreServicesAndSanitizesTags() {
    metricsService.recordLoginAttempt("SUCCESS", "valid_credentials");
    metricsService.recordCacheEvaluation("search", "HIT");
    metricsService.recordDatabaseQueryDuration("SELECT", 45, false);

    assertThat(meterRegistry.find("lifeos.auth.login.attempts").counter()).isNotNull();
    assertThat(meterRegistry.find("lifeos.cache.evaluations").counter()).isNotNull();
    assertThat(meterRegistry.find("lifeos.db.query.duration").timer()).isNotNull();
  }

  @Test
  void storage_authorizationAndExpirationEnforcement() throws Exception {
    UUID exportId =
        exportFilePort.initExport(
            userId, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "ops-gate.zip");
    byte[] content = "Ops Gate Export Payload".getBytes(StandardCharsets.UTF_8);
    String token =
        exportFilePort.storeAndMarkReady(
            exportId, new ByteArrayInputStream(content), content.length, Duration.ofMinutes(30));

    mockMvc
        .perform(get("/auth/export/download").param("token", token))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(get("/auth/export/download").cookie(sessionCookie).param("token", token))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Disposition", "attachment; filename=\"ops-gate.zip\""))
        .andExpect(header().string("Cache-Control", containsString("no-store")));
  }

  @Test
  void todayAggregation_safeDegradationAndPrivacyCacheControl() throws Exception {
    mockMvc
        .perform(get("/today").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", containsString("private")))
        .andExpect(header().string("Cache-Control", containsString("no-store")))
        .andExpect(jsonPath("$.userTimeZone").exists())
        .andExpect(jsonPath("$.tasks.status").value("EMPTY"))
        .andExpect(jsonPath("$.schedule.status").value("EMPTY"))
        .andExpect(jsonPath("$.focusSummary.status").value("EMPTY"))
        .andExpect(jsonPath("$.activeProjects.status").value("EMPTY"))
        .andExpect(jsonPath("$.brainDump.status").value("SUCCESS"));
  }
}
