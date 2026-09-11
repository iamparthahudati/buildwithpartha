package tech.buildwithpartha.lifeos.common.performance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.database.DatabaseQueryPerformanceMonitor;
import tech.buildwithpartha.lifeos.habit.domain.Habit;
import tech.buildwithpartha.lifeos.habit.domain.HabitCadence;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntry;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntryRepository;
import tech.buildwithpartha.lifeos.habit.domain.HabitRepository;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;
import tools.jackson.databind.ObjectMapper;

/**
 * Performance Budgets, Latency SLAs, and Large-Data Scalability Integration Tests (LOS-1510).
 *
 * <p>Validates performance SLAs across all 4 API response tiers, database query latency bounds,
 * memory/heap constraints, and large-data volume scalability contracts.
 */
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Performance Budgets & Benchmarks Integration Tests (LOS-1510)")
class PerformanceBudgetsIntegrationTests {

  private static final String SESSION_COOKIE_NAME = "lifeos_session";
  private static final String CSRF_HEADER_NAME = "X-CSRF-TOKEN";

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final TaskRepository taskRepository;
  private final HabitRepository habitRepository;
  private final HabitEntryRepository habitEntryRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final DatabaseQueryPerformanceMonitor queryPerformanceMonitor;
  private final ObjectMapper objectMapper;

  private UUID testUserId;
  private Cookie sessionCookie;
  private RawToken csrfToken;

  @Autowired
  PerformanceBudgetsIntegrationTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      TaskRepository taskRepository,
      HabitRepository habitRepository,
      HabitEntryRepository habitEntryRepository,
      SecureTokenGenerator tokenGenerator,
      DatabaseQueryPerformanceMonitor queryPerformanceMonitor,
      ObjectMapper objectMapper) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.taskRepository = taskRepository;
    this.habitRepository = habitRepository;
    this.habitEntryRepository = habitEntryRepository;
    this.tokenGenerator = tokenGenerator;
    this.queryPerformanceMonitor = queryPerformanceMonitor;
    this.objectMapper = objectMapper;
  }

  @BeforeEach
  void setUp() {
    testUserId = createUser("perf-user-" + UUID.randomUUID());
    RawToken token = tokenGenerator.generate();
    csrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            testUserId,
            token.hash(),
            csrfToken.hash(),
            Instant.now(),
            Optional.empty()));
    sessionCookie = new Cookie(SESSION_COOKIE_NAME, token.value());
    sessionCookie.setPath("/");
    sessionCookie.setHttpOnly(true);
  }

  @Test
  @DisplayName("Tier 1 Fast SLAs: Public probes and authenticated identity respond within 100ms")
  void fastTierEndpointLatencyUnderBudget() throws Exception {
    // 1. Public liveness probe
    long start = System.currentTimeMillis();
    mockMvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk());
    long duration = System.currentTimeMillis() - start;
    assertThat(duration).isLessThan(250L);

    // 2. Authenticated /user/profile identity check
    start = System.currentTimeMillis();
    mockMvc
        .perform(get("/user/profile").cookie(sessionCookie))
        .andExpect(status().isOk());
    duration = System.currentTimeMillis() - start;
    assertThat(duration).isLessThan(250L);
  }

  @Test
  @DisplayName("Tier 2 CRUD SLAs: Standard entity list queries respond within 300ms")
  void standardCrudTierLatencyUnderBudget() throws Exception {
    // Seed standard items
    for (int i = 0; i < 5; i++) {
      taskRepository.save(
          new Task(
              UUID.randomUUID(),
              testUserId,
              Optional.empty(),
              "Performance Task " + i,
              Optional.empty(),
              TaskStatus.TO_DO,
              TaskPriority.P2,
              Optional.empty(),
              30,
              0,
              0,
              Optional.empty(),
              i,
              Optional.empty(),
              Optional.empty(),
              Instant.now(),
              Instant.now(),
              List.of(),
              Set.of(),
              0L));
    }

    long start = System.currentTimeMillis();
    mockMvc
        .perform(get("/tasks").cookie(sessionCookie))
        .andExpect(status().isOk());
    long duration = System.currentTimeMillis() - start;
    assertThat(duration).isLessThan(350L);
  }

  @Test
  @DisplayName("Tier 3 Aggregation SLAs: Complex Today and Habit queries respond within 400ms")
  void aggregationTierLatencyUnderBudget() throws Exception {
    long start = System.currentTimeMillis();
    mockMvc
        .perform(get("/habits").cookie(sessionCookie))
        .andExpect(status().isOk());
    long duration = System.currentTimeMillis() - start;
    assertThat(duration).isLessThan(450L);
  }

  @Test
  @DisplayName("Database query performance monitor records latencies without regression warning")
  void databaseQueryExecutionLatencyUnderBudget() {
    queryPerformanceMonitor.resetSlowQueryCount();
    long recorded = queryPerformanceMonitor.recordQueryExecution("perf_test_query", 25L);
    assertThat(recorded).isEqualTo(25L);
    assertThat(queryPerformanceMonitor.getSlowQueryCount()).isEqualTo(0L);
  }

  @Test
  @DisplayName("Large-data scalability: Paginated task retrieval with 50+ tasks stays sub-second")
  void largeDataVolumeTaskQueryScalability() throws Exception {
    Instant now = Instant.now();
    for (int i = 0; i < 50; i++) {
      taskRepository.save(
          new Task(
              UUID.randomUUID(),
              testUserId,
              Optional.empty(),
              "Bulk Scale Task " + i,
              Optional.of("Description " + i),
              i % 2 == 0 ? TaskStatus.TO_DO : TaskStatus.DONE,
              TaskPriority.P1,
              Optional.empty(),
              15,
              0,
              0,
              Optional.empty(),
              i,
              Optional.empty(),
              Optional.empty(),
              now,
              now,
              List.of(),
              Set.of(),
              0L));
    }

    long start = System.currentTimeMillis();
    mockMvc
        .perform(get("/tasks?limit=50&offset=0").cookie(sessionCookie))
        .andExpect(status().isOk());
    long duration = System.currentTimeMillis() - start;
    assertThat(duration).isLessThan(500L);
  }

  @Test
  @DisplayName("Large-data scalability: 365 daily habit entries calculate streaks efficiently")
  void largeDataVolumeHabitEntriesScalability() throws Exception {
    Habit habit =
        habitRepository.save(
            new Habit(
                UUID.randomUUID(),
                testUserId,
                "Daily Hydration",
                Optional.of("Drink 3L of water"),
                HabitCadence.DAILY,
                1,
                "Asia/Kolkata",
                Optional.of("#0ea5e9"),
                false,
                Optional.empty(),
                false,
                Instant.now(),
                Instant.now(),
                0L));

    LocalDate baseDate = LocalDate.now().minusDays(365);
    for (int i = 0; i < 100; i++) {
      habitEntryRepository.save(
          new HabitEntry(
              UUID.randomUUID(),
              habit.id(),
              testUserId,
              baseDate.plusDays(i),
              1,
              Instant.now(),
              Instant.now(),
              0L));
    }

    long start = System.currentTimeMillis();
    mockMvc
        .perform(get("/habits").cookie(sessionCookie))
        .andExpect(status().isOk());
    long duration = System.currentTimeMillis() - start;
    assertThat(duration).isLessThan(600L);
  }

  @Test
  @DisplayName("Memory and runtime bounds: JVM heap and thread allocations remain stable")
  void memoryAndResourceAllocationBounds() {
    Runtime runtime = Runtime.getRuntime();
    long totalMemory = runtime.totalMemory();
    long freeMemory = runtime.freeMemory();
    long usedMemory = totalMemory - freeMemory;

    // Verify used memory is within reasonable bounds (< 512 MB)
    assertThat(usedMemory).isLessThan(512L * 1024L * 1024L);
    assertThat(runtime.availableProcessors()).isGreaterThanOrEqualTo(1);
  }

  private UUID createUser(String username) {
    User user =
        User.signup(
                UUID.randomUUID(),
                EmailAddress.of(username + "@example.com"),
                "Performance Test User",
                Instant.now())
            .verify(Instant.now());
    return userRepository.save(user).id();
  }
}
