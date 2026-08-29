package tech.buildwithpartha.lifeos.goal.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.goal.domain.CheckInCadence;
import tech.buildwithpartha.lifeos.goal.domain.Goal;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckInRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalProgressType;
import tech.buildwithpartha.lifeos.goal.domain.GoalRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("GoalController integration tests")
class GoalControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final GoalRepository goalRepository;
  private final GoalCheckInRepository goalCheckInRepository;
  private final GoalLinkRepository goalLinkRepository;
  private final ProjectRepository projectRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private Cookie sessionCookie;
  private RawToken csrfToken;

  private UUID otherUserId;
  private Cookie otherSessionCookie;
  private RawToken otherCsrfToken;

  @Autowired
  GoalControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      GoalRepository goalRepository,
      GoalCheckInRepository goalCheckInRepository,
      GoalLinkRepository goalLinkRepository,
      ProjectRepository projectRepository,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.goalRepository = goalRepository;
    this.goalCheckInRepository = goalCheckInRepository;
    this.goalLinkRepository = goalLinkRepository;
    this.projectRepository = projectRepository;
    this.tokenGenerator = tokenGenerator;
  }

  @BeforeEach
  void setUp() {
    userId = createUser("user-a-" + UUID.randomUUID());
    RawToken sessionTokenA = tokenGenerator.generate();
    csrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userId,
            sessionTokenA.hash(),
            csrfToken.hash(),
            Instant.now(),
            Optional.empty()));
    sessionCookie = new Cookie("lifeos_session", sessionTokenA.value());

    otherUserId = createUser("user-b-" + UUID.randomUUID());
    RawToken sessionTokenB = tokenGenerator.generate();
    otherCsrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            otherUserId,
            sessionTokenB.hash(),
            otherCsrfToken.hash(),
            Instant.now(),
            Optional.empty()));
    otherSessionCookie = new Cookie("lifeos_session", sessionTokenB.value());
  }

  private UUID createUser(String prefix) {
    return userRepository
        .save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of(prefix + "@example.test"),
                    prefix,
                    Instant.now())
                .verify(Instant.now()))
        .id();
  }

  @Test
  @DisplayName("POST /goals creates goal and returns 201 Created with Location header")
  void createGoal() throws Exception {
    String json =
        """
        {
          "title": "Read 12 books",
          "description": "Annual reading goal",
          "category": "LEARNING",
          "progressType": "NUMERIC",
          "targetValue": 12,
          "currentValue": 0,
          "unit": "books",
          "targetDate": "2026-12-31",
          "status": "ACTIVE",
          "checkInCadence": "MONTHLY"
        }
        """;

    mockMvc
        .perform(
            post("/goals")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
        .andExpect(status().isCreated())
        .andExpect(header().exists("Location"))
        .andExpect(jsonPath("$.title").value("Read 12 books"))
        .andExpect(jsonPath("$.category").value("LEARNING"))
        .andExpect(jsonPath("$.status").value("ACTIVE"))
        .andExpect(jsonPath("$.version").value(0));
  }

  @Test
  @DisplayName("GET /goals queries user goals with summary counts")
  void queryGoals() throws Exception {
    Goal goal = createSampleGoal(userId, "Run a marathon", "FITNESS");

    mockMvc
        .perform(get("/goals").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items[0].id").value(goal.id().toString()))
        .andExpect(jsonPath("$.summary.totalGoals").value(1))
        .andExpect(jsonPath("$.summary.activeGoals").value(1));
  }

  @Test
  @DisplayName("GET /goals/{id} returns 200 for owner, 404 for cross-user")
  void getGoalIsolation() throws Exception {
    Goal goal = createSampleGoal(userId, "Learn Rust", "SKILLS");

    mockMvc
        .perform(get("/goals/" + goal.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Learn Rust"));

    mockMvc
        .perform(get("/goals/" + goal.id()).cookie(otherSessionCookie))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("GET /goals/{id}/detail returns aggregate goal detail")
  void getGoalDetail() throws Exception {
    Goal goal = createSampleGoal(userId, "Build startup", "CAREER");

    mockMvc
        .perform(get("/goals/" + goal.id() + "/detail").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.goal.id").value(goal.id().toString()))
        .andExpect(jsonPath("$.progressPercentage").exists())
        .andExpect(jsonPath("$.checkIns").isArray())
        .andExpect(jsonPath("$.links").isArray());
  }

  @Test
  @DisplayName("PUT /goals/{id} updates goal and checks version conflict")
  void updateGoal() throws Exception {
    Goal goal = createSampleGoal(userId, "Old title", "HEALTH");

    String updateJson =
        """
        {
          "title": "New title",
          "description": "Updated desc",
          "category": "HEALTH",
          "progressType": "PERCENTAGE",
          "targetValue": 100,
          "currentValue": 25,
          "unit": "%",
          "version": 0
        }
        """;

    mockMvc
        .perform(
            put("/goals/" + goal.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateJson))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("New title"))
        .andExpect(jsonPath("$.version").value(1));

    // Stale version update returns 409 Conflict
    mockMvc
        .perform(
            put("/goals/" + goal.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateJson)) // version still 0
        .andExpect(status().isConflict());
  }

  @Test
  @DisplayName("POST /goals/{id}/pause and /complete update status")
  void pauseAndCompleteGoal() throws Exception {
    Goal goal = createSampleGoal(userId, "Status transition goal", "WORK");

    mockMvc
        .perform(
            post("/goals/" + goal.id() + "/pause")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\": 0}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PAUSED"))
        .andExpect(jsonPath("$.version").value(1));

    mockMvc
        .perform(
            post("/goals/" + goal.id() + "/complete")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\": 1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("COMPLETED"))
        .andExpect(jsonPath("$.version").value(2));
  }

  @Test
  @DisplayName("POST /goals/{id}/archive and /restore toggle archived state")
  void archiveAndRestoreGoal() throws Exception {
    Goal goal = createSampleGoal(userId, "Archive goal", "TEST");

    mockMvc
        .perform(
            post("/goals/" + goal.id() + "/archive")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\": 0}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archived").value(true))
        .andExpect(jsonPath("$.version").value(1));

    mockMvc
        .perform(
            post("/goals/" + goal.id() + "/restore")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\": 1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archived").value(false))
        .andExpect(jsonPath("$.version").value(2));
  }

  @Test
  @DisplayName("DELETE /goals/{id} deletes goal and returns 204")
  void deleteGoal() throws Exception {
    Goal goal = createSampleGoal(userId, "To be deleted", "TEMP");

    mockMvc
        .perform(
            delete("/goals/" + goal.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/goals/" + goal.id()).cookie(sessionCookie))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Check-in endpoints: record, list, delete")
  void checkInEndpoints() throws Exception {
    Goal goal = createSampleGoal(userId, "Check-in test goal", "TEST");

    String checkInJson =
        """
        {
          "value": 50,
          "note": "Halfway check-in"
        }
        """;

    String checkInResponseStr =
        mockMvc
            .perform(
                post("/goals/" + goal.id() + "/check-ins")
                    .cookie(sessionCookie)
                    .header("X-CSRF-TOKEN", csrfToken.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(checkInJson))
            .andExpect(status().isCreated())
            .andExpect(header().exists("Location"))
            .andExpect(jsonPath("$.value").value(50))
            .andExpect(jsonPath("$.note").value("Halfway check-in"))
            .andReturn()
            .getResponse()
            .getContentAsString();

    String checkInId = com.jayway.jsonpath.JsonPath.read(checkInResponseStr, "$.id");

    mockMvc
        .perform(get("/goals/" + goal.id() + "/check-ins").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].id").value(checkInId));

    mockMvc
        .perform(
            delete("/goals/" + goal.id() + "/check-ins/" + checkInId)
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNoContent());
  }

  @Test
  @DisplayName("Link endpoints: add, list, delete link with target project")
  void linkEndpoints() throws Exception {
    Goal goal = createSampleGoal(userId, "Linking goal", "WORK");

    Project project =
        projectRepository.save(
            new Project(
                UUID.randomUUID(),
                userId,
                "Linked Project",
                Optional.empty(),
                ProjectStatus.ACTIVE,
                ProjectPriority.P1,
                ProjectHealth.ON_TRACK,
                Optional.of("#00FF00"),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Instant.now(),
                Instant.now(),
                Set.of(),
                0L));

    String linkJson =
        String.format(
            """
            {
              "targetType": "PROJECT",
              "targetId": "%s"
            }
            """,
            project.id());

    String linkResponseStr =
        mockMvc
            .perform(
                post("/goals/" + goal.id() + "/links")
                    .cookie(sessionCookie)
                    .header("X-CSRF-TOKEN", csrfToken.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(linkJson))
            .andExpect(status().isCreated())
            .andExpect(header().exists("Location"))
            .andExpect(jsonPath("$.targetType").value("PROJECT"))
            .andExpect(jsonPath("$.targetId").value(project.id().toString()))
            .andReturn()
            .getResponse()
            .getContentAsString();

    String linkId = com.jayway.jsonpath.JsonPath.read(linkResponseStr, "$.id");

    mockMvc
        .perform(get("/goals/" + goal.id() + "/links").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(linkId));

    mockMvc
        .perform(
            delete("/goals/" + goal.id() + "/links/" + linkId)
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNoContent());
  }

  @Test
  @DisplayName("GET /goals/{goalId}/activity returns activity feed")
  void getGoalActivity() throws Exception {
    Goal goal = createSampleGoal(userId, "Activity test goal", "TEST");

    mockMvc
        .perform(get("/goals/" + goal.id() + "/activity").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isArray());
  }

  @Test
  @DisplayName("GET /goals with filters and sorting")
  void queryGoalsWithFiltersAndSorting() throws Exception {
    createSampleGoal(userId, "Fitness goal", "HEALTH");

    mockMvc
        .perform(
            get("/goals")
                .cookie(sessionCookie)
                .param("q", "fitness")
                .param("status", "ACTIVE")
                .param("category", "HEALTH")
                .param("progressType", "PERCENTAGE")
                .param("archived", "false")
                .param("sortBy", "title")
                .param("sortDirection", "ASC"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items[0].title").value("Fitness goal"));
  }

  @Test
  @DisplayName("GET /goals invalid parameters return 400 Bad Request")
  void queryGoalsInvalidParameters() throws Exception {
    mockMvc
        .perform(get("/goals").cookie(sessionCookie).param("page", "-1"))
        .andExpect(status().isBadRequest());

    mockMvc
        .perform(get("/goals").cookie(sessionCookie).param("size", "200"))
        .andExpect(status().isBadRequest());

    mockMvc
        .perform(get("/goals").cookie(sessionCookie).param("sortBy", "invalidField"))
        .andExpect(status().isBadRequest());

    mockMvc
        .perform(get("/goals").cookie(sessionCookie).param("sortDirection", "invalidDirection"))
        .andExpect(status().isBadRequest());

    mockMvc
        .perform(get("/goals").cookie(sessionCookie).param("status", "INVALID_STATUS"))
        .andExpect(status().isBadRequest());

    mockMvc
        .perform(get("/goals").cookie(sessionCookie).param("progressType", "INVALID_TYPE"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("GET /goals/{id}/detail and GET /goals/summary endpoints")
  void getDetailAndSummaryEndpoints() throws Exception {
    Goal goal = createSampleGoal(userId, "Detail & Summary Goal", "WORK");

    mockMvc
        .perform(get("/goals/" + goal.id() + "/detail").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.goal.id").value(goal.id().toString()))
        .andExpect(jsonPath("$.checkIns").isArray())
        .andExpect(jsonPath("$.links").isArray());

    mockMvc
        .perform(get("/goals").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.summary.totalGoals").isNumber())
        .andExpect(jsonPath("$.summary.activeGoals").isNumber());
  }

  @Test
  @DisplayName("Validation failures on POST/PUT endpoints return 400 Bad Request")
  void validationFailuresOnEndpoints() throws Exception {
    Goal goal = createSampleGoal(userId, "Validation Goal", "WORK");

    // Create invalid: missing title, category, progressType, currentValue
    mockMvc
        .perform(
            post("/goals")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());

    // Update invalid: missing fields
    mockMvc
        .perform(
            put("/goals/" + goal.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());

    // Add check-in invalid: missing value
    mockMvc
        .perform(
            post("/goals/" + goal.id() + "/check-ins")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());

    // Add link invalid: missing targetType and targetId
    mockMvc
        .perform(
            post("/goals/" + goal.id() + "/links")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());

    // List check-ins invalid page/size
    mockMvc
        .perform(
            get("/goals/" + goal.id() + "/check-ins").cookie(sessionCookie).param("page", "-1"))
        .andExpect(status().isBadRequest());
  }

  private Goal createSampleGoal(UUID ownerId, String title, String category) {
    Goal goal =
        new Goal(
            UUID.randomUUID(),
            ownerId,
            title,
            Optional.of("Sample goal description"),
            category,
            GoalProgressType.PERCENTAGE,
            Optional.of(BigDecimal.valueOf(100)),
            BigDecimal.ZERO,
            Optional.of("%"),
            Optional.of(LocalDate.of(2026, 12, 31)),
            GoalStatus.ACTIVE,
            CheckInCadence.WEEKLY,
            false,
            Instant.now(),
            Instant.now(),
            0L);
    return goalRepository.save(goal);
  }
}
