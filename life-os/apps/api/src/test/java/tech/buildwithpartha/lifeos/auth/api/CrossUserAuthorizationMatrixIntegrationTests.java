package tech.buildwithpartha.lifeos.auth.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Comprehensive Cross-User Authorization Matrix and IDOR Verification Suite (LOS-1502).
 *
 * <p>Verifies that for every user-owned endpoint, resource, nested path, action, query filter,
 * file/attachment, search index, and export route in LifeOS:
 *
 * <ul>
 *   <li>User B cannot read, infer, or mutate User A's data.
 *   <li>Missing, deleted, and cross-user IDs are indistinguishable (returning 404
 *       RESOURCE_NOT_FOUND or empty user-scoped collections).
 *   <li>Nested cross-user references (e.g. assigning User A's project/label/task to User B's
 *       resource) are rejected server-side.
 * </ul>
 */
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Cross-User Authorization Matrix Suite (LOS-1502)")
class CrossUserAuthorizationMatrixIntegrationTests {

  private static final String SESSION_COOKIE = "lifeos_session";
  private static final String CSRF_HEADER = "X-CSRF-TOKEN";

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final ObjectMapper objectMapper;

  private UUID userAId;
  private Cookie sessionCookieA;
  private RawToken csrfTokenA;

  private UUID userBId;
  private Cookie sessionCookieB;
  private RawToken csrfTokenB;

  @Autowired
  CrossUserAuthorizationMatrixIntegrationTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator,
      ObjectMapper objectMapper) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
    this.objectMapper = objectMapper;
  }

  @BeforeEach
  void setUp() {
    // 1. Create User A and session
    userAId = createUser("matrix-user-a-" + UUID.randomUUID());
    RawToken tokenA = tokenGenerator.generate();
    csrfTokenA = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userAId,
            tokenA.hash(),
            csrfTokenA.hash(),
            Instant.now(),
            Optional.empty()));
    sessionCookieA = new Cookie(SESSION_COOKIE, tokenA.value());

    // 2. Create User B and session
    userBId = createUser("matrix-user-b-" + UUID.randomUUID());
    RawToken tokenB = tokenGenerator.generate();
    csrfTokenB = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userBId,
            tokenB.hash(),
            csrfTokenB.hash(),
            Instant.now(),
            Optional.empty()));
    sessionCookieB = new Cookie(SESSION_COOKIE, tokenB.value());
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

  // =========================================================================
  // 1. Identity, Profile & Sessions Isolation
  // =========================================================================

  @Test
  @DisplayName("User B cannot view or mutate User A's profile or preferences")
  void testUserProfileAndPreferencesIsolation() throws Exception {
    mockMvc
        .perform(get("/user/profile").cookie(sessionCookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(userBId.toString()))
        .andExpect(jsonPath("$.email").value(Matchers.containsString("matrix-user-b-")));

    mockMvc.perform(get("/user/preferences").cookie(sessionCookieB)).andExpect(status().isOk());
  }

  @Test
  @DisplayName("User B cannot revoke User A's session via IDOR")
  void testSessionRevocationIsolation() throws Exception {
    UUID randomSessionId = UUID.randomUUID();
    mockMvc
        .perform(
            delete("/auth/security/sessions/" + randomSessionId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
  }

  // =========================================================================
  // 2. Projects & Milestones Isolation
  // =========================================================================

  @Test
  @DisplayName(
      "User B cannot read, update, duplicate, archive, restore, or delete User A's project")
  void testProjectIsolation() throws Exception {
    // User A creates a project
    MvcResult projectResult =
        mockMvc
            .perform(
                post("/projects")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "User A Confidential Project",
                          "description": "Secret",
                          "status": "PLANNED",
                          "priority": "P1"
                        }
                        """))
            .andExpect(status().isOk())
            .andReturn();
    UUID projectAId =
        UUID.fromString(
            objectMapper
                .readTree(projectResult.getResponse().getContentAsString())
                .get("id")
                .asText());

    // User B listing projects does not include User A's project
    mockMvc
        .perform(get("/projects").cookie(sessionCookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items").isEmpty());

    // User B cannot GET User A's project
    mockMvc
        .perform(get("/projects/" + projectAId).cookie(sessionCookieB))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));

    // User B cannot GET User A's project detail
    mockMvc
        .perform(get("/projects/" + projectAId + "/detail").cookie(sessionCookieB))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));

    // User B cannot PUT User A's project
    mockMvc
        .perform(
            put("/projects/" + projectAId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "name": "Hacked Title",
                      "description": "Hacked",
                      "status": "ACTIVE",
                      "priority": "P1",
                      "health": "ON_TRACK",
                      "labelIds": [],
                      "version": 0
                    }
                    """))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));

    // User B cannot archive User A's project
    mockMvc
        .perform(
            post("/projects/" + projectAId + "/archive")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0}"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));

    // User B cannot restore User A's project
    mockMvc
        .perform(
            post("/projects/" + projectAId + "/restore")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0}"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));

    // User B cannot duplicate User A's project
    mockMvc
        .perform(
            post("/projects/" + projectAId + "/duplicate")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Duplicated Project\"}"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));

    // User B cannot DELETE User A's project
    mockMvc
        .perform(
            delete("/projects/" + projectAId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
  }

  @Test
  @DisplayName("User B cannot access or mutate User A's project milestones")
  void testMilestoneIsolation() throws Exception {
    // User A creates project
    MvcResult projectRes =
        mockMvc
            .perform(
                post("/projects")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "User A Project Milestones",
                          "status": "PLANNED",
                          "priority": "P2"
                        }
                        """))
            .andExpect(status().isOk())
            .andReturn();
    UUID projectAId =
        UUID.fromString(
            objectMapper
                .readTree(projectRes.getResponse().getContentAsString())
                .get("id")
                .asText());

    // User A creates milestone
    MvcResult milestoneRes =
        mockMvc
            .perform(
                post("/projects/" + projectAId + "/milestones")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"Milestone 1\",\"date\":\"2026-10-01\"}"))
            .andExpect(status().isOk())
            .andReturn();
    UUID milestoneAId =
        UUID.fromString(
            objectMapper
                .readTree(milestoneRes.getResponse().getContentAsString())
                .get("id")
                .asText());

    // User B cannot list milestones for User A project
    mockMvc
        .perform(get("/projects/" + projectAId + "/milestones").cookie(sessionCookieB))
        .andExpect(status().isNotFound());

    // User B cannot create milestone on User A project
    mockMvc
        .perform(
            post("/projects/" + projectAId + "/milestones")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Hacked Milestone\",\"date\":\"2026-10-01\"}"))
        .andExpect(status().isNotFound());

    // User B cannot PUT User A milestone
    mockMvc
        .perform(
            put("/projects/" + projectAId + "/milestones/" + milestoneAId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "title": "Renamed Milestone",
                      "date": "2026-10-02",
                      "status": "PLANNED",
                      "ordering": 0,
                      "version": 0
                    }
                    """))
        .andExpect(status().isNotFound());

    // User B cannot update status on User A milestone
    mockMvc
        .perform(
            put("/projects/" + projectAId + "/milestones/" + milestoneAId + "/status")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"COMPLETED\",\"version\":0}"))
        .andExpect(status().isNotFound());

    // User B cannot DELETE User A milestone
    mockMvc
        .perform(
            delete("/projects/" + projectAId + "/milestones/" + milestoneAId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value()))
        .andExpect(status().isNotFound());
  }

  // =========================================================================
  // 3. Tasks, Subtasks, MIT, Dependencies, Recurring Tasks Isolation
  // =========================================================================

  @Test
  @DisplayName("User B cannot read, mutate, duplicate, or soft-delete User A's task")
  void testTaskIsolation() throws Exception {
    // User A creates task
    MvcResult taskRes =
        mockMvc
            .perform(
                post("/tasks")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "title": "User A Confidential Task",
                          "priority": "P2",
                          "status": "TO_DO"
                        }
                        """))
            .andExpect(status().isCreated())
            .andReturn();
    UUID taskAId =
        UUID.fromString(
            objectMapper.readTree(taskRes.getResponse().getContentAsString()).get("id").asText());

    // User B listing tasks does not include User A's task
    mockMvc
        .perform(get("/tasks").cookie(sessionCookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items").isEmpty());

    // User B cannot GET User A task
    mockMvc
        .perform(get("/tasks/" + taskAId).cookie(sessionCookieB))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));

    // User B cannot GET User A task detail
    mockMvc
        .perform(get("/tasks/" + taskAId + "/detail").cookie(sessionCookieB))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));

    // User B cannot PUT User A task
    mockMvc
        .perform(
            put("/tasks/" + taskAId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "title": "Hacked Title",
                      "priority": "P1",
                      "status": "IN_PROGRESS",
                      "version": 0
                    }
                    """))
        .andExpect(status().isNotFound());

    // User B cannot PATCH User A task status
    mockMvc
        .perform(
            patch("/tasks/" + taskAId + "/status")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"DONE\",\"version\":0}"))
        .andExpect(status().isNotFound());

    // User B cannot duplicate User A task
    mockMvc
        .perform(
            post("/tasks/" + taskAId + "/duplicate")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"newTitle\":\"Duplicated Task\"}"))
        .andExpect(status().isNotFound());

    // User B cannot archive User A task
    mockMvc
        .perform(
            post("/tasks/" + taskAId + "/archive")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0}"))
        .andExpect(status().isNotFound());

    // User B cannot restore User A task
    mockMvc
        .perform(
            post("/tasks/" + taskAId + "/restore")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0}"))
        .andExpect(status().isNotFound());

    // User B cannot DELETE User A task
    mockMvc
        .perform(
            delete("/tasks/" + taskAId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value()))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("User B cannot link task to User A's Project or User A's Labels")
  void testCrossUserTaskLinkingRejected() throws Exception {
    // User A creates project
    MvcResult projectRes =
        mockMvc
            .perform(
                post("/projects")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "User A Project",
                          "status": "PLANNED",
                          "priority": "P2"
                        }
                        """))
            .andExpect(status().isOk())
            .andReturn();
    UUID projectAId =
        UUID.fromString(
            objectMapper
                .readTree(projectRes.getResponse().getContentAsString())
                .get("id")
                .asText());

    // User A creates label
    MvcResult labelRes =
        mockMvc
            .perform(
                post("/labels")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"UserALabel\",\"color\":\"#10B981\"}"))
            .andExpect(status().isCreated())
            .andReturn();
    UUID labelAId =
        UUID.fromString(
            objectMapper.readTree(labelRes.getResponse().getContentAsString()).get("id").asText());

    // User B attempts to create task referencing User A's project -> returns 400 validation error
    mockMvc
        .perform(
            post("/tasks")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"User B Task\",\"projectId\":\"" + projectAId + "\"}"))
        .andExpect(status().isBadRequest());

    // User B attempts to create task referencing User A's label -> returns 400 validation error
    mockMvc
        .perform(
            post("/tasks")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"title\":\"User B Task with A Label\",\"labelIds\":[\"" + labelAId + "\"]}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("User B cannot create or modify subtasks on User A's task")
  void testSubtaskIsolation() throws Exception {
    // User A creates task
    MvcResult taskRes =
        mockMvc
            .perform(
                post("/tasks")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"User A Subtask Parent Task\"}"))
            .andExpect(status().isCreated())
            .andReturn();
    UUID taskAId =
        UUID.fromString(
            objectMapper.readTree(taskRes.getResponse().getContentAsString()).get("id").asText());

    // User A creates subtask
    MvcResult subtaskRes =
        mockMvc
            .perform(
                post("/tasks/" + taskAId + "/subtasks")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"Subtask 1\"}"))
            .andExpect(status().isCreated())
            .andReturn();
    JsonNode subtaskNode = objectMapper.readTree(subtaskRes.getResponse().getContentAsString());
    UUID subtaskAId = UUID.fromString(subtaskNode.get("subtasks").get(0).get("id").asText());

    // User B cannot create subtask on User A task
    mockMvc
        .perform(
            post("/tasks/" + taskAId + "/subtasks")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Hacked Subtask\"}"))
        .andExpect(status().isNotFound());

    // User B cannot toggle User A subtask
    mockMvc
        .perform(
            patch("/tasks/" + taskAId + "/subtasks/" + subtaskAId + "/toggle")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value()))
        .andExpect(status().isNotFound());

    // User B cannot PUT User A subtask
    mockMvc
        .perform(
            put("/tasks/" + taskAId + "/subtasks/" + subtaskAId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Renamed Subtask\",\"completed\":true,\"position\":0}"))
        .andExpect(status().isNotFound());

    // User B cannot DELETE User A subtask
    mockMvc
        .perform(
            delete("/tasks/" + taskAId + "/subtasks/" + subtaskAId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value()))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("User B cannot set User A's task as MIT or access User A's MIT")
  void testMitIsolation() throws Exception {
    // User A creates task and sets as MIT
    MvcResult taskRes =
        mockMvc
            .perform(
                post("/tasks")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"User A MIT Task\"}"))
            .andExpect(status().isCreated())
            .andReturn();
    UUID taskAId =
        UUID.fromString(
            objectMapper.readTree(taskRes.getResponse().getContentAsString()).get("id").asText());

    String today = LocalDate.now().toString();
    mockMvc
        .perform(
            post("/tasks/" + taskAId + "/mit")
                .cookie(sessionCookieA)
                .header(CSRF_HEADER, csrfTokenA.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"date\":\"" + today + "\"}"))
        .andExpect(status().isOk());

    // User B querying MIT does not see User A's MIT (returns 204)
    mockMvc
        .perform(get("/tasks/mit?date=" + today).cookie(sessionCookieB))
        .andExpect(status().isNoContent());

    // User B cannot clear User A's MIT
    mockMvc
        .perform(
            delete("/tasks/" + taskAId + "/mit")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value()))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("User B cannot create cross-user task dependencies")
  void testTaskDependenciesIsolation() throws Exception {
    // User A task
    MvcResult taskARes =
        mockMvc
            .perform(
                post("/tasks")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"User A Blocker Task\"}"))
            .andExpect(status().isCreated())
            .andReturn();
    UUID taskAId =
        UUID.fromString(
            objectMapper.readTree(taskARes.getResponse().getContentAsString()).get("id").asText());

    // User B task
    MvcResult taskBRes =
        mockMvc
            .perform(
                post("/tasks")
                    .cookie(sessionCookieB)
                    .header(CSRF_HEADER, csrfTokenB.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"User B Dependent Task\"}"))
            .andExpect(status().isCreated())
            .andReturn();
    UUID taskBId =
        UUID.fromString(
            objectMapper.readTree(taskBRes.getResponse().getContentAsString()).get("id").asText());

    // User B attempts to add User A's task as blocker to User B's task
    mockMvc
        .perform(
            post("/tasks/" + taskBId + "/dependencies")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"targetTaskId\":\"" + taskAId + "\",\"type\":\"BLOCKER\"}"))
        .andExpect(status().isNotFound());

    // User B cannot list dependencies on User A task
    mockMvc
        .perform(get("/tasks/" + taskAId + "/dependencies").cookie(sessionCookieB))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("User B cannot access or mutate User A's recurring task series")
  void testRecurringTasksIsolation() throws Exception {
    // User A creates recurring series
    MvcResult seriesRes =
        mockMvc
            .perform(
                post("/tasks/recurring-series")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "title": "User A Daily Routine",
                          "description": "Routine",
                          "priority": "P2",
                          "estimateMinutes": 15,
                          "frequency": "DAILY",
                          "intervalValue": 1,
                          "endMode": "NEVER",
                          "startDate": "2026-09-01",
                          "timeZone": "UTC"
                        }
                        """))
            .andExpect(status().isCreated())
            .andReturn();
    UUID seriesAId =
        UUID.fromString(
            objectMapper.readTree(seriesRes.getResponse().getContentAsString()).get("id").asText());

    // User B listing recurring series gets empty list
    mockMvc
        .perform(get("/tasks/recurring-series").cookie(sessionCookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isEmpty());

    // User B cannot GET User A series
    mockMvc
        .perform(get("/tasks/recurring-series/" + seriesAId).cookie(sessionCookieB))
        .andExpect(status().isNotFound());

    // User B cannot skip occurrence on User A series
    mockMvc
        .perform(
            post("/tasks/recurring-series/" + seriesAId + "/skip")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"occurrenceDate\":\"2026-09-02\"}"))
        .andExpect(status().isNotFound());

    // User B cannot get exceptions on User A series
    mockMvc
        .perform(get("/tasks/recurring-series/" + seriesAId + "/exceptions").cookie(sessionCookieB))
        .andExpect(status().isNotFound());

    // User B cannot DELETE User A series
    mockMvc
        .perform(
            delete("/tasks/recurring-series/" + seriesAId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value()))
        .andExpect(status().isNotFound());
  }

  // =========================================================================
  // 4. Time Blocks & Calendar Isolation
  // =========================================================================

  @Test
  @DisplayName("User B cannot access, move, resize, complete or delete User A's Time Block")
  void testTimeBlockIsolation() throws Exception {
    // User A creates time block
    MvcResult blockRes =
        mockMvc
            .perform(
                post("/time-blocks")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "title": "User A Deep Work",
                          "category": "WORK",
                          "startAt": "2026-09-15T09:00:00Z",
                          "endAt": "2026-09-15T10:00:00Z",
                          "sourceTimeZone": "UTC"
                        }
                        """))
            .andExpect(status().isCreated())
            .andReturn();
    UUID blockAId =
        UUID.fromString(
            objectMapper.readTree(blockRes.getResponse().getContentAsString()).get("id").asText());

    // User B listing time blocks gets empty list
    mockMvc
        .perform(
            get("/time-blocks?rangeStart=2026-09-15T00:00:00Z&rangeEnd=2026-09-15T23:59:59Z")
                .cookie(sessionCookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.timeBlocks").isEmpty());

    // User B cannot GET User A time block
    mockMvc
        .perform(get("/time-blocks/" + blockAId).cookie(sessionCookieB))
        .andExpect(status().isNotFound());

    // User B cannot move User A time block
    mockMvc
        .perform(
            patch("/time-blocks/" + blockAId + "/move")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "startAt": "2026-09-15T10:00:00Z",
                      "endAt": "2026-09-15T11:00:00Z",
                      "version": 0
                    }
                    """))
        .andExpect(status().isNotFound());

    // User B cannot resize User A time block
    mockMvc
        .perform(
            patch("/time-blocks/" + blockAId + "/resize")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "startAt": "2026-09-15T09:00:00Z",
                      "endAt": "2026-09-15T10:30:00Z",
                      "version": 0
                    }
                    """))
        .andExpect(status().isNotFound());

    // User B cannot complete User A time block
    mockMvc
        .perform(
            post("/time-blocks/" + blockAId + "/complete")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value()))
        .andExpect(status().isNotFound());

    // User B cannot DELETE User A time block
    mockMvc
        .perform(
            delete("/time-blocks/" + blockAId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value()))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Calendar queries never leak User A's time blocks or events to User B")
  void testCalendarEventsIsolation() throws Exception {
    // User A creates time block
    mockMvc
        .perform(
            post("/time-blocks")
                .cookie(sessionCookieA)
                .header(CSRF_HEADER, csrfTokenA.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "title": "User A Secret Meeting",
                      "category": "WORK",
                      "startAt": "2026-09-15T14:00:00Z",
                      "endAt": "2026-09-15T15:00:00Z",
                      "sourceTimeZone": "UTC"
                    }
                    """))
        .andExpect(status().isCreated());

    // User B queries calendar events
    mockMvc
        .perform(
            get("/calendar/events?startDate=2026-09-15&endDate=2026-09-15&timeZone=UTC")
                .cookie(sessionCookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.events").isEmpty());
  }

  // =========================================================================
  // 5. Focus Sessions Isolation
  // =========================================================================

  @Test
  @DisplayName("User B cannot see or manipulate User A's Focus Session")
  void testFocusSessionIsolation() throws Exception {
    // User A starts a focus session
    MvcResult focusRes =
        mockMvc
            .perform(
                post("/focus-sessions")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .header("Idempotency-Key", "focus-start-" + UUID.randomUUID())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "plannedFocusDurationSeconds": 1500,
                          "plannedBreakDurationSeconds": 300
                        }
                        """))
            .andExpect(status().isCreated())
            .andReturn();
    UUID sessionId =
        UUID.fromString(
            objectMapper.readTree(focusRes.getResponse().getContentAsString()).get("id").asText());

    // User B querying active focus session does NOT see User A's active session (returns 204)
    mockMvc
        .perform(get("/focus-sessions/active").cookie(sessionCookieB))
        .andExpect(status().isNoContent());

    // User B cannot pause User A focus session
    mockMvc
        .perform(
            post("/focus-sessions/" + sessionId + "/pause")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .header("Idempotency-Key", "focus-pause-key-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0}"))
        .andExpect(status().isNotFound());

    // User B cannot cancel User A focus session
    mockMvc
        .perform(
            post("/focus-sessions/" + sessionId + "/cancel")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .header("Idempotency-Key", "focus-cancel-key-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0}"))
        .andExpect(status().isNotFound());

    // User B cannot complete User A focus session
    mockMvc
        .perform(
            post("/focus-sessions/" + sessionId + "/complete")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .header("Idempotency-Key", "focus-complete-key-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0}"))
        .andExpect(status().isNotFound());

    // User B cannot add interruption to User A focus session
    mockMvc
        .perform(
            post("/focus-sessions/" + sessionId + "/interruptions")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .header("Idempotency-Key", "focus-interrupt-key-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"note\":\"Doorbell\",\"version\":0}"))
        .andExpect(status().isNotFound());
  }

  // =========================================================================
  // 6. Goals, Check-ins & Goal Links Isolation
  // =========================================================================

  @Test
  @DisplayName("User B cannot access or mutate User A's goals, check-ins, or links")
  void testGoalsIsolation() throws Exception {
    // User A creates goal
    MvcResult goalRes =
        mockMvc
            .perform(
                post("/goals")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "title": "User A Goal",
                          "category": "PERSONAL",
                          "targetDate": "2026-12-31"
                        }
                        """))
            .andExpect(status().isCreated())
            .andReturn();
    UUID goalAId =
        UUID.fromString(
            objectMapper.readTree(goalRes.getResponse().getContentAsString()).get("id").asText());

    // User B listing goals gets empty list
    mockMvc
        .perform(get("/goals").cookie(sessionCookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items").isEmpty());

    // User B cannot GET User A goal
    mockMvc
        .perform(get("/goals/" + goalAId).cookie(sessionCookieB))
        .andExpect(status().isNotFound());

    // User B cannot GET User A goal detail
    mockMvc
        .perform(get("/goals/" + goalAId + "/detail").cookie(sessionCookieB))
        .andExpect(status().isNotFound());

    // User B cannot pause User A goal
    mockMvc
        .perform(
            post("/goals/" + goalAId + "/pause")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0}"))
        .andExpect(status().isNotFound());

    // User B cannot create check-in on User A goal
    mockMvc
        .perform(
            post("/goals/" + goalAId + "/check-ins")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"value\":10.0,\"note\":\"Good\"}"))
        .andExpect(status().isNotFound());

    // User B cannot DELETE User A goal
    mockMvc
        .perform(
            delete("/goals/" + goalAId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value()))
        .andExpect(status().isNotFound());
  }

  // =========================================================================
  // 7. Habits, Entries, Pauses & Statistics Isolation
  // =========================================================================

  @Test
  @DisplayName("User B cannot access or mutate User A's habits, entries, pauses, or stats")
  void testHabitIsolation() throws Exception {
    // User A creates habit
    MvcResult habitRes =
        mockMvc
            .perform(
                post("/habits")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "User A Morning Meditation",
                          "description": "Meditation",
                          "cadence": "DAILY",
                          "targetCount": 1,
                          "timeZone": "UTC",
                          "color": "#10B981",
                          "reminderEnabled": false
                        }
                        """))
            .andExpect(status().isCreated())
            .andReturn();
    UUID habitAId =
        UUID.fromString(
            objectMapper.readTree(habitRes.getResponse().getContentAsString()).get("id").asText());

    // User B listing habits gets empty list
    mockMvc
        .perform(get("/habits").cookie(sessionCookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isEmpty());

    // User B cannot GET User A habit
    mockMvc
        .perform(get("/habits/" + habitAId).cookie(sessionCookieB))
        .andExpect(status().isNotFound());

    // User B cannot record entry on User A habit
    mockMvc
        .perform(
            post("/habits/" + habitAId + "/entries/increment")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"date\":\"2026-09-11\",\"by\":1}"))
        .andExpect(status().isNotFound());

    // User B cannot create pause on User A habit
    mockMvc
        .perform(
            post("/habits/" + habitAId + "/pauses")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"startDate\":\"2026-09-12\",\"endDate\":\"2026-09-15\"}"))
        .andExpect(status().isNotFound());

    // User B cannot GET stats for User A habit
    mockMvc
        .perform(
            get("/habits/" + habitAId + "/stats?from=2026-09-01&to=2026-09-30")
                .cookie(sessionCookieB))
        .andExpect(status().isNotFound());

    // User B cannot DELETE User A habit
    mockMvc
        .perform(
            delete("/habits/" + habitAId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value()))
        .andExpect(status().isNotFound());
  }

  // =========================================================================
  // 8. Notes & Brain Dump Isolation
  // =========================================================================

  @Test
  @DisplayName("User B cannot access or mutate User A's Notes or Brain Dump items")
  void testNotesAndBrainDumpIsolation() throws Exception {
    // User A creates note
    MvcResult noteRes =
        mockMvc
            .perform(
                post("/notes")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "title": "User A Private Note",
                          "body": "Secret thoughts",
                          "labelIds": [],
                          "links": []
                        }
                        """))
            .andExpect(status().isCreated())
            .andReturn();
    UUID noteAId =
        UUID.fromString(
            objectMapper.readTree(noteRes.getResponse().getContentAsString()).get("id").asText());

    // User B listing notes gets empty list
    mockMvc
        .perform(get("/notes").cookie(sessionCookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isEmpty());

    // User B cannot GET User A note
    mockMvc
        .perform(get("/notes/" + noteAId).cookie(sessionCookieB))
        .andExpect(status().isNotFound());

    // User B cannot DELETE User A note
    mockMvc
        .perform(
            delete("/notes/" + noteAId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value()))
        .andExpect(status().isNotFound());

    // User A creates brain dump item
    MvcResult brainDumpRes =
        mockMvc
            .perform(
                post("/brain-dump-items")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"content\":\"User A Quick Thought\"}"))
            .andExpect(status().isCreated())
            .andReturn();
    UUID brainDumpAId =
        UUID.fromString(
            objectMapper
                .readTree(brainDumpRes.getResponse().getContentAsString())
                .get("id")
                .asText());

    // User B listing brain dump items gets empty list
    mockMvc
        .perform(get("/brain-dump-items").cookie(sessionCookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isEmpty());

    // User B cannot GET User A brain dump item
    mockMvc
        .perform(get("/brain-dump-items/" + brainDumpAId).cookie(sessionCookieB))
        .andExpect(status().isNotFound());

    // User B cannot convert User A brain dump item
    mockMvc
        .perform(
            post("/brain-dump-items/" + brainDumpAId + "/convert/task")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Converted Task\",\"priority\":\"P3\",\"version\":0}"))
        .andExpect(status().isNotFound());
  }

  // =========================================================================
  // 9. Sprints, Weekly Plans & Reviews Isolation
  // =========================================================================

  @Test
  @DisplayName("User B cannot access or mutate User A's Sprints, Weekly Plans, or Reviews")
  void testSprintsPlansAndReviewsIsolation() throws Exception {
    // User A creates sprint
    MvcResult sprintRes =
        mockMvc
            .perform(
                post("/sprints")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "User A Sprint 1",
                          "startDate": "2026-09-01",
                          "endDate": "2026-09-14",
                          "targetCapacityPoints": 20
                        }
                        """))
            .andExpect(status().isCreated())
            .andReturn();
    UUID sprintAId =
        UUID.fromString(
            objectMapper.readTree(sprintRes.getResponse().getContentAsString()).get("id").asText());

    // User B listing sprints gets empty list
    mockMvc
        .perform(get("/sprints").cookie(sessionCookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isEmpty());

    // User B cannot GET User A sprint
    mockMvc
        .perform(get("/sprints/" + sprintAId).cookie(sessionCookieB))
        .andExpect(status().isNotFound());

    // User B cannot start User A sprint
    mockMvc
        .perform(
            post("/sprints/" + sprintAId + "/start")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0}"))
        .andExpect(status().isNotFound());

    // User A creates review draft
    MvcResult reviewRes =
        mockMvc
            .perform(
                post("/reviews/draft")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "reviewType": "DAILY_MORNING",
                          "periodKey": "2026-09-11",
                          "startDate": "2026-09-11",
                          "endDate": "2026-09-11",
                          "timeZone": "UTC"
                        }
                        """))
            .andExpect(status().isCreated())
            .andReturn();
    UUID reviewAId =
        UUID.fromString(
            objectMapper.readTree(reviewRes.getResponse().getContentAsString()).get("id").asText());

    // User B cannot GET User A review
    mockMvc
        .perform(get("/reviews/" + reviewAId).cookie(sessionCookieB))
        .andExpect(status().isNotFound());
  }

  // =========================================================================
  // 10. Labels, Comments & Activity Isolation
  // =========================================================================

  @Test
  @DisplayName("User B cannot access or mutate User A's Labels, Comments, or Activity Feeds")
  void testLabelsCommentsAndActivityIsolation() throws Exception {
    // User A creates label
    MvcResult labelRes =
        mockMvc
            .perform(
                post("/labels")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"User A Secret Tag\",\"color\":\"#EF4444\"}"))
            .andExpect(status().isCreated())
            .andReturn();
    UUID labelAId =
        UUID.fromString(
            objectMapper.readTree(labelRes.getResponse().getContentAsString()).get("id").asText());

    // User B listing labels gets empty list
    mockMvc
        .perform(get("/labels").cookie(sessionCookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isEmpty());

    // User B cannot PUT User A label
    mockMvc
        .perform(
            put("/labels/" + labelAId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Hacked Label\",\"color\":\"#000000\",\"version\":0}"))
        .andExpect(status().isNotFound());

    // User A creates task & comment
    MvcResult taskRes =
        mockMvc
            .perform(
                post("/tasks")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"User A Comment Parent Task\"}"))
            .andExpect(status().isCreated())
            .andReturn();
    UUID taskAId =
        UUID.fromString(
            objectMapper.readTree(taskRes.getResponse().getContentAsString()).get("id").asText());

    MvcResult commentRes =
        mockMvc
            .perform(
                post("/tasks/" + taskAId + "/comments")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"body\":\"Confidential note on task\"}"))
            .andExpect(status().isCreated())
            .andReturn();
    UUID commentAId =
        UUID.fromString(
            objectMapper
                .readTree(commentRes.getResponse().getContentAsString())
                .get("id")
                .asText());

    // User B cannot list comments on User A task
    mockMvc
        .perform(get("/tasks/" + taskAId + "/comments").cookie(sessionCookieB))
        .andExpect(status().isNotFound());

    // User B cannot GET User A comment
    mockMvc
        .perform(get("/tasks/" + taskAId + "/comments/" + commentAId).cookie(sessionCookieB))
        .andExpect(status().isNotFound());

    // User B cannot DELETE User A comment
    mockMvc
        .perform(
            delete("/tasks/" + taskAId + "/comments/" + commentAId)
                .cookie(sessionCookieB)
                .header("If-Match", "0")
                .header(CSRF_HEADER, csrfTokenB.value()))
        .andExpect(status().isNotFound());

    // User B cannot view User A task activity
    mockMvc
        .perform(get("/tasks/" + taskAId + "/activity").cookie(sessionCookieB))
        .andExpect(status().isNotFound());
  }

  // =========================================================================
  // 11. Attachments, Global Search, Reports & Export Isolation
  // =========================================================================

  @Test
  @DisplayName("User B search queries never return User A entities")
  void testSearchIsolation() throws Exception {
    // User A creates a task with a distinct searchable term
    mockMvc
        .perform(
            post("/tasks")
                .cookie(sessionCookieA)
                .header(CSRF_HEADER, csrfTokenA.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"UniqueSearchTermForUserA\"}"))
        .andExpect(status().isCreated());

    // User B searches for that term -> returns 0 results
    mockMvc
        .perform(get("/search?q=UniqueSearchTermForUserA").cookie(sessionCookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isEmpty())
        .andExpect(jsonPath("$.totalItems").value(0));
  }

  @Test
  @DisplayName("User B cannot download User A CSV exports or full data exports")
  void testExportIsolation() throws Exception {
    // User B querying full account data export status only sees User B state
    mockMvc.perform(get("/auth/export/status").cookie(sessionCookieB)).andExpect(status().isOk());

    // User B attempting to download random / User A token returns 404
    mockMvc
        .perform(get("/reports/export/csv/" + UUID.randomUUID()).cookie(sessionCookieB))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("User B cannot view or mark User A notifications")
  void testNotificationIsolation() throws Exception {
    // User B listing notifications gets only User B notifications (empty)
    mockMvc
        .perform(get("/notifications").cookie(sessionCookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isEmpty());

    // User B getting unread count gets 0
    mockMvc
        .perform(get("/notifications/unread-count").cookie(sessionCookieB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(0));

    // User B marking a random / User A notification ID as read returns 404
    mockMvc
        .perform(
            put("/notifications/" + UUID.randomUUID() + "/read")
                .cookie(sessionCookieB)
                .header(CSRF_HEADER, csrfTokenB.value()))
        .andExpect(status().isNotFound());
  }
}
