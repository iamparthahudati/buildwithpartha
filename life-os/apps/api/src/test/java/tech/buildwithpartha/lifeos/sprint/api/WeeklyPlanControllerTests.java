package tech.buildwithpartha.lifeos.sprint.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.List;
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
import org.springframework.test.web.servlet.MvcResult;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;
import tech.buildwithpartha.lifeos.user.application.UpdateProfileCommand;
import tech.buildwithpartha.lifeos.user.application.UserProfileService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class WeeklyPlanControllerTests {
  private final MockMvc mockMvc;
  private final ObjectMapper mapper;
  private final UserRepository users;
  private final SessionRepository sessions;
  private final SecureTokenGenerator tokens;
  private final TaskRepository tasks;
  private final TimeBlockRepository timeBlocks;
  private final UserProfileService profiles;
  private UUID userId;
  private Cookie cookie;
  private RawToken csrf;

  @Autowired
  WeeklyPlanControllerTests(
      MockMvc mockMvc,
      ObjectMapper mapper,
      UserRepository users,
      SessionRepository sessions,
      SecureTokenGenerator tokens,
      TaskRepository tasks,
      TimeBlockRepository timeBlocks,
      UserProfileService profiles) {
    this.mockMvc = mockMvc;
    this.mapper = mapper;
    this.users = users;
    this.sessions = sessions;
    this.tokens = tokens;
    this.tasks = tasks;
    this.timeBlocks = timeBlocks;
    this.profiles = profiles;
  }

  @BeforeEach
  void setUp() {
    userId = createUser("weekly-plan-owner");
    profiles.updateProfile(
        userId, new UpdateProfileCommand("Weekly Planner", "America/New_York", "en-US", 7));
    RawToken session = tokens.generate();
    csrf = tokens.generate();
    sessions.save(
        Session.issue(
            UUID.randomUUID(),
            userId,
            session.hash(),
            csrf.hash(),
            Instant.now(),
            Optional.empty()));
    cookie = new Cookie("lifeos_session", session.value());
  }

  @Test
  void derivesAccountWeekAndReturnsLiveCapacityAndScheduleWarnings() throws Exception {
    Task task = createTask(userId, "Prepare launch notes", TaskStatus.TO_DO);
    createOverlappingBlocks();
    JsonNode plan = createPlan(task.id(), "2026-11-04", 60, 90);

    assertThat(plan.get("weekStartDate").asText()).isEqualTo("2026-11-01");
    assertThat(plan.get("weekEndDate").asText()).isEqualTo("2026-11-07");
    assertThat(plan.get("timeZone").asText()).isEqualTo("America/New_York");
    assertThat(plan.get("weekStartDay").asInt()).isEqualTo(7);
    assertThat(plan.get("capacities")).hasSize(7);
    assertThat(plan.at("/conflictSummary/overcapacityMinutes").asInt()).isEqualTo(30);
    assertThat(plan.at("/conflictSummary/overlappingTimeBlockCount").asInt()).isEqualTo(1);
    assertThat(plan.at("/conflictSummary/hasWarnings").asBoolean()).isTrue();

    JsonNode finalized = command(plan, "finalize");
    mockMvc
        .perform(get("/weekly-plans/" + finalized.get("id").asText()).cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.conflictSummary.overcapacityDates[0]").value("2026-11-01"));

    mockMvc
        .perform(get("/weekly-plans").cookie(cookie).queryParam("weekDate", "2026-11-06"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(plan.get("id").asText()));
  }

  @Test
  void updatesFinalizesIdempotentlyAndReopensWithoutChangingHistory() throws Exception {
    Task task = createTask(userId, "Original task title", TaskStatus.TO_DO);
    JsonNode draft = createPlan(task.id(), "2027-02-10", 120, 90);
    UUID outcomeId = UUID.fromString(draft.at("/outcomes/0/id").asText());
    UUID itemId = UUID.fromString(draft.at("/items/0/id").asText());
    String update =
        updateBody(
            task.id(), outcomeId, itemId, "2027-02-07", 180, 90, draft.get("version").asLong());
    JsonNode updated =
        body(
            put("/weekly-plans/" + draft.get("id").asText())
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(update));

    JsonNode finalized = command(updated, "finalize");
    assertThat(finalized.get("status").asText()).isEqualTo("FINALIZED");
    assertThat(finalized.at("/conflictSummary/hasWarnings").asBoolean()).isFalse();

    Task changed =
        tasks.save(
            task.withUpdates(
                null,
                "Changed after finalization",
                null,
                TaskStatus.DONE,
                null,
                null,
                null,
                null,
                100,
                null,
                null,
                Instant.now()));
    assertThat(changed.status()).isEqualTo(TaskStatus.DONE);

    JsonNode retry =
        body(
            post("/weekly-plans/" + finalized.get("id").asText() + "/finalize")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0}"));
    assertThat(retry.at("/items/0/taskTitleSnapshot").asText()).isEqualTo("Original task title");

    JsonNode reopened = command(finalized, "reopen");
    assertThat(reopened.get("status").asText()).isEqualTo("DRAFT");
    assertThat(reopened.get("revision").asInt()).isEqualTo(2);
    assertThat(reopened.get("predecessorPlanId").asText()).isEqualTo(finalized.get("id").asText());
    assertThat(reopened.at("/items/0/outcomeId").asText())
        .isEqualTo(reopened.at("/outcomes/0/id").asText());

    mockMvc
        .perform(
            post("/weekly-plans/" + finalized.get("id").asText() + "/reopen")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":" + finalized.get("version").asLong() + "}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("WEEKLY_PLAN_STATE_CONFLICT"));

    mockMvc
        .perform(
            post("/weekly-plans/" + reopened.get("id").asText() + "/reopen")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":" + reopened.get("version").asLong() + "}"))
        .andExpect(status().isConflict());

    mockMvc
        .perform(
            put("/weekly-plans/" + finalized.get("id").asText())
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateBody(task.id(), outcomeId, itemId, "2027-02-07", 180, 90, 0)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("WEEKLY_PLAN_STATE_CONFLICT"));
  }

  @Test
  void enforcesOwnershipCsrfVersionAndAllocationBoundaries() throws Exception {
    Task task = createTask(userId, "Owned task", TaskStatus.TO_DO);
    JsonNode plan = createPlan(task.id(), "2027-03-01", 60, 30);

    mockMvc
        .perform(get("/weekly-plans").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(plan.get("id").asText()));

    Task secondTask = createTask(userId, "Second owned task", TaskStatus.TO_DO);
    mockMvc
        .perform(
            post("/weekly-plans")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    createBodyWithIds(
                        secondTask.id(),
                        "2027-04-01",
                        UUID.fromString(plan.at("/outcomes/0/id").asText()),
                        UUID.randomUUID())))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].code").value("ID_ALREADY_IN_USE"));

    mockMvc
        .perform(
            post("/weekly-plans")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    createBodyWithIds(
                        secondTask.id(),
                        "2027-04-01",
                        UUID.randomUUID(),
                        UUID.fromString(plan.at("/items/0/id").asText()))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].code").value("ID_ALREADY_IN_USE"));

    mockMvc
        .perform(
            post("/weekly-plans")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody(task.id(), "2027-03-02", 60, 30)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("WEEKLY_PLAN_STATE_CONFLICT"));

    mockMvc
        .perform(
            put("/weekly-plans/" + plan.get("id").asText())
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    updateBody(
                        task.id(),
                        UUID.fromString(plan.at("/outcomes/0/id").asText()),
                        UUID.fromString(plan.at("/items/0/id").asText()),
                        "2027-03-01",
                        60,
                        30,
                        99)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CONCURRENCY_CONFLICT"));

    mockMvc
        .perform(
            put("/weekly-plans/" + plan.get("id").asText())
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    updateBody(
                        task.id(),
                        UUID.fromString(plan.at("/outcomes/0/id").asText()),
                        UUID.fromString(plan.at("/items/0/id").asText()),
                        "2027-03-09",
                        60,
                        30,
                        plan.get("version").asLong())))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].code").value("OUTSIDE_WEEK"));

    mockMvc
        .perform(
            post("/weekly-plans")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody(task.id(), "2027-04-01", 60, 30)))
        .andExpect(status().isForbidden());
    mockMvc.perform(get("/weekly-plans")).andExpect(status().isUnauthorized());

    UUID otherUser = createUser("weekly-plan-other");
    RawToken otherSession = tokens.generate();
    RawToken otherCsrf = tokens.generate();
    sessions.save(
        Session.issue(
            UUID.randomUUID(),
            otherUser,
            otherSession.hash(),
            otherCsrf.hash(),
            Instant.now(),
            Optional.empty()));
    mockMvc
        .perform(
            get("/weekly-plans/" + plan.get("id").asText())
                .cookie(new Cookie("lifeos_session", otherSession.value())))
        .andExpect(status().isNotFound());

    Task done = createTask(userId, "Already done", TaskStatus.DONE);
    mockMvc
        .perform(
            post("/weekly-plans")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody(done.id(), "2027-04-01", 60, 30)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].code").value("TASK_NOT_AVAILABLE"));
  }

  private JsonNode createPlan(UUID taskId, String weekDate, int capacity, int planned)
      throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/weekly-plans")
                    .cookie(cookie)
                    .header("X-CSRF-TOKEN", csrf.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createBody(taskId, weekDate, capacity, planned)))
            .andExpect(status().isCreated())
            .andExpect(
                header().string("Location", org.hamcrest.Matchers.containsString("/weekly-plans/")))
            .andReturn();
    return mapper.readTree(result.getResponse().getContentAsString());
  }

  private JsonNode command(JsonNode plan, String command) throws Exception {
    return body(
        post("/weekly-plans/" + plan.get("id").asText() + "/" + command)
            .cookie(cookie)
            .header("X-CSRF-TOKEN", csrf.value())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"version\":" + plan.get("version").asLong() + "}"));
  }

  private JsonNode body(
      org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request)
      throws Exception {
    return mapper.readTree(
        mockMvc
            .perform(request)
            .andExpect(status().is2xxSuccessful())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  private static String createBody(UUID taskId, String weekDate, int capacity, int planned) {
    UUID outcomeId = UUID.randomUUID();
    UUID itemId = UUID.randomUUID();
    String date = weekDate.equals("2026-11-04") ? "2026-11-01" : weekDate;
    return """
        {"weekDate":"%s","capacities":[{"localDate":"%s","availableMinutes":%d}],
         "outcomes":[{"id":"%s","title":"Ship the weekly outcome","position":0}],
         "items":[{"id":"%s","taskId":"%s","outcomeId":"%s",
           "plannedDate":"%s","plannedMinutes":%d,"position":0}]}
        """
        .formatted(weekDate, date, capacity, outcomeId, itemId, taskId, outcomeId, date, planned);
  }

  private static String updateBody(
      UUID taskId,
      UUID outcomeId,
      UUID itemId,
      String date,
      int capacity,
      int planned,
      long version) {
    return """
        {"capacities":[{"localDate":"%s","availableMinutes":%d}],
         "outcomes":[{"id":"%s","title":"Ship the weekly outcome","position":0}],
         "items":[{"id":"%s","taskId":"%s","outcomeId":"%s",
           "plannedDate":"%s","plannedMinutes":%d,"position":0}],"version":%d}
        """
        .formatted(date, capacity, outcomeId, itemId, taskId, outcomeId, date, planned, version);
  }

  private static String createBodyWithIds(
      UUID taskId, String weekDate, UUID outcomeId, UUID itemId) {
    return """
        {"weekDate":"%s","capacities":[],
         "outcomes":[{"id":"%s","title":"Unique outcome","position":0}],
         "items":[{"id":"%s","taskId":"%s","outcomeId":"%s",
           "plannedDate":"%s","plannedMinutes":30,"position":0}]}
        """
        .formatted(weekDate, outcomeId, itemId, taskId, outcomeId, weekDate);
  }

  private UUID createUser(String prefix) {
    return users
        .save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of(prefix + "-" + UUID.randomUUID() + "@example.test"),
                    "Weekly Planner",
                    Instant.now())
                .verify(Instant.now()))
        .id();
  }

  private Task createTask(UUID owner, String title, TaskStatus status) {
    Instant now = Instant.now();
    return tasks.save(
        new Task(
            UUID.randomUUID(),
            owner,
            Optional.empty(),
            title,
            Optional.empty(),
            status,
            TaskPriority.P2,
            Optional.empty(),
            30,
            0,
            status == TaskStatus.DONE ? 100 : 0,
            Optional.empty(),
            0,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            0L));
  }

  private void createOverlappingBlocks() {
    Instant now = Instant.now();
    timeBlocks.save(
        new TimeBlock(
            UUID.randomUUID(),
            userId,
            Optional.empty(),
            Optional.empty(),
            "First schedule item",
            "FOCUS",
            TimeBlockStatus.SCHEDULED,
            Instant.parse("2026-11-01T14:00:00Z"),
            Instant.parse("2026-11-01T15:00:00Z"),
            "America/New_York",
            Optional.empty(),
            now,
            now,
            0L));
    timeBlocks.save(
        new TimeBlock(
            UUID.randomUUID(),
            userId,
            Optional.empty(),
            Optional.empty(),
            "Second schedule item",
            "FOCUS",
            TimeBlockStatus.SCHEDULED,
            Instant.parse("2026-11-01T14:30:00Z"),
            Instant.parse("2026-11-01T15:30:00Z"),
            "America/New_York",
            Optional.empty(),
            now,
            now,
            0L));
    timeBlocks.save(
        new TimeBlock(
            UUID.randomUUID(),
            userId,
            Optional.empty(),
            Optional.empty(),
            "Cancelled schedule item",
            "FOCUS",
            TimeBlockStatus.CANCELLED,
            Instant.parse("2026-11-01T14:15:00Z"),
            Instant.parse("2026-11-01T14:45:00Z"),
            "America/New_York",
            Optional.empty(),
            now,
            now,
            0L));
  }
}
