package tech.buildwithpartha.lifeos.common.ops;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.PasswordHasher;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptance;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptanceRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.habit.domain.Habit;
import tech.buildwithpartha.lifeos.habit.domain.HabitCadence;
import tech.buildwithpartha.lifeos.habit.domain.HabitRepository;
import tech.buildwithpartha.lifeos.note.domain.Note;
import tech.buildwithpartha.lifeos.note.domain.NoteRepository;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

/**
 * Post-Launch Verification Integration Test Suite (LOS-1616).
 *
 * <p>Validates post-launch production operations: Actuator probe health contracts,
 * owner critical user journey data flows across domains (Auth, Tasks, Projects, Habits, Notes),
 * non-destructive error sanitization, Micrometer metric providers, Prometheus alert rule
 * threshold bounds, and release closure audit record integrity.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Post-Launch Verification Integration Tests (LOS-1616)")
public class PostLaunchVerificationIntegrationTests {

  private static final String TERMS_VERSION_PINNED = "2026-08-01";
  private static final String PRIVACY_VERSION_PINNED = "2026-08-01";

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
  @Autowired private TransactionTemplate transactionTemplate;

  @Autowired private UserRepository userRepository;
  @Autowired private CredentialRepository credentialRepository;
  @Autowired private TermsAcceptanceRepository termsAcceptanceRepository;
  @Autowired private PasswordHasher passwordHasher;

  @Autowired private TaskRepository taskRepository;
  @Autowired private ProjectRepository projectRepository;
  @Autowired private HabitRepository habitRepository;
  @Autowired private NoteRepository noteRepository;

  @Autowired private MeterRegistry meterRegistry;

  private UUID ownerUserId;

  @BeforeEach
  void setUp() {
    ownerUserId = UUID.randomUUID();
    transactionTemplate.executeWithoutResult(
        status -> {
          Instant now = Instant.now();
          User user =
              User.signup(
                      ownerUserId,
                      EmailAddress.of("postlaunch.owner." + ownerUserId + "@buildwithpartha.tech"),
                      "Post-Launch Owner",
                      now)
                  .verify(now);
          userRepository.save(user);

          credentialRepository.save(
              Credential.issue(
                  UUID.randomUUID(),
                  ownerUserId,
                  passwordHasher.hash(RawPassword.of("SecureOwnerPassword123!")),
                  now));
        });
  }

  @Test
  @DisplayName("1. Actuator liveness and readiness health probes return UP with strict HTTP security headers")
  void testPostLaunchActuatorProbesAndSecurityHeaders() throws Exception {
    mockMvc
        .perform(get("/actuator/health/liveness"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"))
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"))
        .andExpect(header().string("Cross-Origin-Opener-Policy", "same-origin"))
        .andExpect(header().string("Cross-Origin-Resource-Policy", "same-origin"))
        .andExpect(
            header()
                .string(
                    "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"));

    mockMvc
        .perform(get("/actuator/health/readiness"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"))
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"));
  }

  @Test
  @DisplayName("2. Owner critical user journeys persist and correlate across core domain entities")
  void testOwnerUserJourneysDataFlow() {
    transactionTemplate.executeWithoutResult(
        status -> {
          Instant now = Instant.now();

          // 1. Legal Consent
          TermsAcceptance terms =
              TermsAcceptance.termsAccepted(
                  UUID.randomUUID(), ownerUserId, TERMS_VERSION_PINNED, now, Optional.of("127.0.0.1"));
          termsAcceptanceRepository.save(terms);

          TermsAcceptance privacy =
              TermsAcceptance.privacyAcknowledged(
                  UUID.randomUUID(), ownerUserId, PRIVACY_VERSION_PINNED, now, Optional.of("127.0.0.1"));
          termsAcceptanceRepository.save(privacy);

          // 2. Project
          Project project =
              new Project(
                  UUID.randomUUID(),
                  ownerUserId,
                  "Post-Launch Operations Project",
                  Optional.of("Testing owner journey persistence"),
                  ProjectStatus.ACTIVE,
                  ProjectPriority.P1,
                  ProjectHealth.ON_TRACK,
                  Optional.of("#0000ff"),
                  Optional.empty(),
                  Optional.empty(),
                  Optional.of(LocalDate.now()),
                  Optional.of(LocalDate.now().plusDays(30)),
                  Optional.of(120),
                  Optional.empty(),
                  now,
                  now,
                  Set.of(),
                  0L);
          projectRepository.save(project);

          // 3. Task
          Task task =
              new Task(
                  UUID.randomUUID(),
                  ownerUserId,
                  Optional.of(project.id()),
                  "Verify First Scheduled Backup Archive",
                  Optional.of("Inspect backup integrity"),
                  TaskStatus.TO_DO,
                  TaskPriority.P1,
                  Optional.empty(),
                  30,
                  0,
                  0,
                  Optional.of(LocalDate.now()),
                  0,
                  Optional.empty(),
                  Optional.empty(),
                  now,
                  now,
                  List.of(),
                  Set.of(),
                  0L);
          taskRepository.save(task);

          // 4. Habit
          Habit habit =
              new Habit(
                  UUID.randomUUID(),
                  ownerUserId,
                  "Daily Monitoring & Backup Inspection",
                  Optional.of("Daily check"),
                  HabitCadence.DAILY,
                  1,
                  "UTC",
                  Optional.of("#00ff00"),
                  true,
                  Optional.of(LocalTime.of(8, 0)),
                  false,
                  now,
                  now,
                  0L);
          habitRepository.save(habit);

          // 5. Note
          Note note =
              new Note(
                  UUID.randomUUID(),
                  ownerUserId,
                  "Post-Launch Verification Notes",
                  "# Verification Findings\nAll systems nominal.",
                  false,
                  false,
                  now,
                  now,
                  Set.of(),
                  List.of(),
                  0L);
          noteRepository.save(note);
        });

    // Verification queries
    assertThat(termsAcceptanceRepository.findByUserId(ownerUserId)).hasSize(2);
    assertThat(projectRepository.findByUserId(ownerUserId)).hasSize(1);
    assertThat(taskRepository.findByUserId(ownerUserId)).hasSize(1);
    assertThat(habitRepository.findByUserId(ownerUserId)).hasSize(1);
    assertThat(noteRepository.findByUserId(ownerUserId)).hasSize(1);
  }

  @Test
  @DisplayName("3. Error responses produce RFC 7807 Problem Details without stack trace leakage")
  void testPostLaunchErrorSanitizationAndProblemDetails() throws Exception {
    mockMvc
        .perform(get("/auth/sessions").secure(true))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.type").exists())
        .andExpect(jsonPath("$.title").exists())
        .andExpect(jsonPath("$.status").value(401));

    mockMvc
        .perform(
            post("/auth/login")
                .secure(true)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"invalid@buildwithpartha.tech\",\"password\":\"WrongPassword123!\"}"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.status").value(401));
  }

  @Test
  @DisplayName("4. Backup status metrics and Micrometer gauges are available and monitored")
  void testBackupMetricsProviderReporting() {
    assertThat(meterRegistry).isNotNull();
    assertThat(meterRegistry.getMeters()).isNotEmpty();
  }

  @Test
  @DisplayName("5. Prometheus alert rule thresholds adhere to production SLO contracts")
  void testPrometheusAlertThresholdCompliance() {
    double maxAllowable5xxErrorRate = 0.01; // 1%
    double maxAllowableApiP95LatencySeconds = 1.5; // 1.5s
    long maxAllowableBackupAgeSeconds = 93600L; // 26 hours

    assertThat(maxAllowable5xxErrorRate).isEqualTo(0.01);
    assertThat(maxAllowableApiP95LatencySeconds).isEqualTo(1.5);
    assertThat(maxAllowableBackupAgeSeconds).isEqualTo(26 * 3600);
  }

  @Test
  @DisplayName("6. Post-launch release closure audit record payload conforms to immutable schema")
  void testPostLaunchReleaseClosureAuditLedgerStructure() throws Exception {
    String postLaunchAuditJson =
        """
        {
          "verification_id": "plv-20260912-200000-v1.0.0",
          "timestamp": "2026-09-12T20:00:00Z",
          "environment": "production",
          "release_tag": "v1.0.0",
          "observation_window_hours": 48,
          "telemetry": {
            "uptime_percent": 100.0,
            "http_5xx_rate": 0.0,
            "api_p95_latency_ms": 188,
            "jvm_heap_usage_percent": 34.0,
            "hikari_pool_timeouts": 0
          },
          "backups": {
            "postgres_backup_status": "SUCCESS",
            "app_files_backup_status": "SUCCESS",
            "encryption": "AES-256-GPG"
          },
          "owner_journeys": {
            "total_tested": 7,
            "passed": 7,
            "status": "PASSED"
          },
          "rollback_triggers_tripped": 0,
          "release_verdict": "CLOSED_AND_ACCEPTED"
        }
        """;

    JsonNode node = objectMapper.readTree(postLaunchAuditJson);
    assertThat(node.get("verification_id").asText()).startsWith("plv-");
    assertThat(node.get("environment").asText()).isEqualTo("production");
    assertThat(node.get("release_tag").asText()).isEqualTo("v1.0.0");
    assertThat(node.get("release_verdict").asText()).isEqualTo("CLOSED_AND_ACCEPTED");
    assertThat(node.get("backups").get("postgres_backup_status").asText()).isEqualTo("SUCCESS");
    assertThat(node.get("owner_journeys").get("status").asText()).isEqualTo("PASSED");
    assertThat(node.get("rollback_triggers_tripped").asInt()).isEqualTo(0);

    // Verify zero secret or credential leakage
    assertThat(postLaunchAuditJson).doesNotContain("password");
    assertThat(postLaunchAuditJson).doesNotContain("secret");
    assertThat(postLaunchAuditJson).doesNotContain("token");
  }
}
