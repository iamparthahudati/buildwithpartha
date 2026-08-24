package tech.buildwithpartha.lifeos.sprint.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class SprintControllerTests {
  private final MockMvc mockMvc;
  private final ObjectMapper mapper;
  private final UserRepository users;
  private final SessionRepository sessions;
  private final SecureTokenGenerator tokens;
  private final TaskRepository tasks;
  private UUID userId;
  private Cookie cookie;
  private RawToken csrf;

  @Autowired
  SprintControllerTests(
      MockMvc mockMvc,
      ObjectMapper mapper,
      UserRepository users,
      SessionRepository sessions,
      SecureTokenGenerator tokens,
      TaskRepository tasks) {
    this.mockMvc = mockMvc;
    this.mapper = mapper;
    this.users = users;
    this.sessions = sessions;
    this.tokens = tokens;
    this.tasks = tasks;
  }

  @BeforeEach
  void setUp() {
    userId = createUser("sprint-owner");
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
  void createsListsAndProtectsOwnedSprint() throws Exception {
    Task task = createTask(userId, "Plan API", TaskStatus.TO_DO);
    JsonNode sprint = createSprint("Sprint One", "2026-09-01", "2026-09-07", task.id(), 5);

    mockMvc
        .perform(get("/sprints").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].name").value("Sprint One"))
        .andExpect(jsonPath("$[0].tasks[0].taskId").value(task.id().toString()))
        .andExpect(jsonPath("$[0].events[0].eventType").value("CREATED"));

    UUID otherUser = createUser("sprint-other");
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
            get("/sprints/" + sprint.get("id").asText())
                .cookie(new Cookie("lifeos_session", otherSession.value())))
        .andExpect(status().isNotFound());
  }

  @Test
  void enforcesDateOverlapValidationCsrfAndOptimisticVersion() throws Exception {
    JsonNode sprint = createSprint("First", "2026-10-01", "2026-10-07", null, 0);
    mockMvc
        .perform(
            post("/sprints")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody("Overlap", "2026-10-07", "2026-10-10", null, 0)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].code").value("OVERLAPS_SPRINT"));

    mockMvc
        .perform(
            put("/sprints/" + sprint.get("id").asText())
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"name\":\"Changed\",\"startDate\":\"2026-10-01\","
                        + "\"endDate\":\"2026-10-07\",\"targetCapacityPoints\":4,\"version\":99}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CONCURRENCY_CONFLICT"));

    mockMvc
        .perform(
            post("/sprints")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody("No csrf", "2026-11-01", "2026-11-07", null, 0)))
        .andExpect(status().isForbidden());
    mockMvc.perform(get("/sprints")).andExpect(status().isUnauthorized());
  }

  @Test
  void logsActiveScopeChangesAndAllowsOnlyOneActiveSprint() throws Exception {
    Task first = createTask(userId, "First task", TaskStatus.TO_DO);
    Task second = createTask(userId, "Second task", TaskStatus.TO_DO);
    JsonNode sprint = createSprint("Active", "2026-12-01", "2026-12-07", first.id(), 3);
    sprint = command(sprint, "start", "{\"version\":" + sprint.get("version").asLong() + "}");
    long version = sprint.get("version").asLong();
    sprint =
        body(
            post("/sprints/" + sprint.get("id").asText() + "/tasks")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"taskId\":\""
                        + second.id()
                        + "\",\"storyPoints\":5,\"position\":1,"
                        + "\"reason\":\"New scope\",\"version\":"
                        + version
                        + "}"));
    version = sprint.get("version").asLong();
    sprint =
        body(
            put("/sprints/" + sprint.get("id").asText() + "/tasks/" + second.id())
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"storyPoints\":8,\"position\":1,\"reason\":\"Re-estimated\",\"version\":"
                        + version
                        + "}"));
    version = sprint.get("version").asLong();
    sprint =
        body(
            post("/sprints/" + sprint.get("id").asText() + "/tasks/" + first.id() + "/remove")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"No longer needed\",\"version\":" + version + "}"));
    org.assertj.core.api.Assertions.assertThat(sprint.get("events").toString())
        .contains("TASK_ADDED", "POINTS_CHANGED", "TASK_REMOVED");
    org.assertj.core.api.Assertions.assertThat(
            sprint.get("tasks").get(1).get("addedAfterStart").asBoolean())
        .isTrue();

    JsonNode secondSprint = createSprint("Next", "2026-12-08", "2026-12-14", null, 0);
    mockMvc
        .perform(
            post("/sprints/" + secondSprint.get("id").asText() + "/start")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":" + secondSprint.get("version").asLong() + "}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("SPRINT_STATE_CONFLICT"));
  }

  @Test
  void completesWithStableMetricsRetrospectiveAndCarryOver() throws Exception {
    Task done = createTask(userId, "Completed work", TaskStatus.TO_DO);
    Task open = createTask(userId, "Open work", TaskStatus.TO_DO);
    JsonNode source = createSprint("Source", "2027-01-01", "2027-01-07", done.id(), 5);
    source =
        body(
            post("/sprints/" + source.get("id").asText() + "/tasks")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"taskId\":\""
                        + open.id()
                        + "\",\"storyPoints\":3,\"position\":1,\"version\":"
                        + source.get("version").asLong()
                        + "}"));
    source = command(source, "start", "{\"version\":" + source.get("version").asLong() + "}");
    Task currentDone = tasks.findByIdAndUserId(done.id(), userId).orElseThrow();
    tasks.save(
        currentDone.withUpdates(
            currentDone.projectId(),
            currentDone.title(),
            currentDone.description(),
            TaskStatus.DONE,
            currentDone.priority(),
            currentDone.dueAt(),
            currentDone.estimateMinutes(),
            currentDone.spentMinutes(),
            100,
            currentDone.mitDate(),
            currentDone.position(),
            Instant.now()));
    JsonNode target = createSprint("Target", "2027-01-08", "2027-01-14", null, 0);

    MvcResult result =
        mockMvc
            .perform(
                post("/sprints/" + source.get("id").asText() + "/complete")
                    .cookie(cookie)
                    .header("X-CSRF-TOKEN", csrf.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"whatWentWell\":\"Clear scope\","
                            + "\"actionItems\":[\"Keep reviews short\"],"
                            + "\"carryOverDestination\":\"NEXT_SPRINT\",\"targetSprintId\":\""
                            + target.get("id").asText()
                            + "\",\"targetVersion\":"
                            + target.get("version").asLong()
                            + ",\"version\":"
                            + source.get("version").asLong()
                            + "}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("COMPLETED"))
            .andExpect(jsonPath("$.committedTaskCount").value(2))
            .andExpect(jsonPath("$.completedTaskCount").value(1))
            .andExpect(jsonPath("$.totalStoryPoints").value(8))
            .andExpect(jsonPath("$.completedStoryPoints").value(5))
            .andExpect(jsonPath("$.carriedOverTaskCount").value(1))
            .andExpect(jsonPath("$.whatWentWell").value("Clear scope"))
            .andReturn();
    JsonNode completed = mapper.readTree(result.getResponse().getContentAsString());
    mockMvc
        .perform(get("/sprints/" + target.get("id").asText()).cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.tasks[0].taskId").value(open.id().toString()));
    mockMvc
        .perform(
            post("/sprints/" + completed.get("id").asText() + "/tasks")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"taskId\":\""
                        + UUID.randomUUID()
                        + "\",\"storyPoints\":1,\"position\":0,\"version\":"
                        + completed.get("version").asLong()
                        + "}"))
        .andExpect(status().isConflict());
  }

  @Test
  void cancelsAndDeletesOnlyPlannedSprints() throws Exception {
    JsonNode cancel = createSprint("Cancel", "2027-02-01", "2027-02-07", null, 0);
    cancel = command(cancel, "cancel", "{\"version\":" + cancel.get("version").asLong() + "}");
    mockMvc
        .perform(
            delete("/sprints/" + cancel.get("id").asText())
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .queryParam("version", cancel.get("version").asText()))
        .andExpect(status().isConflict());

    JsonNode planned = createSprint("Delete", "2027-03-01", "2027-03-07", null, 0);
    mockMvc
        .perform(
            delete("/sprints/" + planned.get("id").asText())
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .queryParam("version", planned.get("version").asText()))
        .andExpect(status().isNoContent());
    mockMvc
        .perform(get("/sprints/" + planned.get("id").asText()).cookie(cookie))
        .andExpect(status().isNotFound());
  }

  @Test
  void supportsUpdatesFiltersAndScopeValidationBranches() throws Exception {
    Task task = createTask(userId, "Scoped task", TaskStatus.TO_DO);
    JsonNode sprint = createSprint("Editable", "2027-04-01", "2027-04-07", task.id(), 2);

    mockMvc
        .perform(get("/sprints").cookie(cookie).queryParam("status", "planned,completed"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].status").value("PLANNED"));
    mockMvc
        .perform(get("/sprints").cookie(cookie).queryParam("status", "unknown"))
        .andExpect(status().isBadRequest());

    sprint =
        body(
            put("/sprints/" + sprint.get("id").asText())
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"name\":\"Updated\",\"goal\":\"A new goal\","
                        + "\"startDate\":\"2027-04-01\",\"endDate\":\"2027-04-07\","
                        + "\"targetCapacityPoints\":30,\"version\":"
                        + sprint.get("version").asLong()
                        + "}"));
    org.assertj.core.api.Assertions.assertThat(sprint.get("events").toString())
        .contains("GOAL_CHANGED", "CAPACITY_CHANGED", "UPDATED");

    long version = sprint.get("version").asLong();
    mockMvc
        .perform(
            post("/sprints/" + sprint.get("id").asText() + "/tasks")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"taskId\":\""
                        + task.id()
                        + "\",\"storyPoints\":2,\"position\":0,\"version\":"
                        + version
                        + "}"))
        .andExpect(status().isBadRequest());

    sprint =
        body(
            put("/sprints/" + sprint.get("id").asText() + "/tasks/" + task.id())
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"storyPoints\":2,\"position\":3,\"version\":" + version + "}"));
    version = sprint.get("version").asLong();
    UUID missing = UUID.randomUUID();
    mockMvc
        .perform(
            put("/sprints/" + sprint.get("id").asText() + "/tasks/" + missing)
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"storyPoints\":1,\"position\":0,\"version\":" + version + "}"))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(
            post("/sprints/" + sprint.get("id").asText() + "/tasks/" + missing + "/remove")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":" + version + "}"))
        .andExpect(status().isNotFound());
  }

  @Test
  void completesToBacklogAndRejectsInvalidTransitionsAndTasks() throws Exception {
    Task terminalTask = createTask(userId, "Already done", TaskStatus.DONE);
    mockMvc
        .perform(
            post("/sprints")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    createBody("Invalid task", "2027-05-01", "2027-05-07", terminalTask.id(), 1)))
        .andExpect(status().isBadRequest());

    Task open = createTask(userId, "Still open", TaskStatus.TO_DO);
    Task removed = createTask(userId, "Removed", TaskStatus.TO_DO);
    JsonNode sprint = createSprint("Backlog", "2027-05-01", "2027-05-07", open.id(), 3);
    sprint =
        body(
            post("/sprints/" + sprint.get("id").asText() + "/tasks")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"taskId\":\""
                        + removed.id()
                        + "\",\"storyPoints\":2,\"position\":1,\"version\":"
                        + sprint.get("version").asLong()
                        + "}"));
    sprint =
        body(
            post("/sprints/" + sprint.get("id").asText() + "/tasks/" + removed.id() + "/remove")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":" + sprint.get("version").asLong() + "}"));
    sprint = command(sprint, "start", "{\"version\":" + sprint.get("version").asLong() + "}");

    mockMvc
        .perform(
            post("/sprints/" + sprint.get("id").asText() + "/start")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":" + sprint.get("version").asLong() + "}"))
        .andExpect(status().isConflict());

    sprint =
        body(
            post("/sprints/" + sprint.get("id").asText() + "/complete")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"carryOverDestination\":\"BACKLOG\",\"version\":"
                        + sprint.get("version").asLong()
                        + "}"));
    org.assertj.core.api.Assertions.assertThat(sprint.get("removedTaskCount").asInt()).isOne();
    org.assertj.core.api.Assertions.assertThat(sprint.get("carriedOverTaskCount").asInt()).isZero();

    mockMvc
        .perform(
            post("/sprints/" + sprint.get("id").asText() + "/complete")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"carryOverDestination\":\"BACKLOG\",\"version\":"
                        + sprint.get("version").asLong()
                        + "}"))
        .andExpect(status().isConflict());
    mockMvc
        .perform(
            put("/sprints/" + sprint.get("id").asText())
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"name\":\"No edit\",\"startDate\":\"2027-05-01\","
                        + "\"endDate\":\"2027-05-07\",\"targetCapacityPoints\":1,"
                        + "\"version\":"
                        + sprint.get("version").asLong()
                        + "}"))
        .andExpect(status().isConflict());
  }

  private JsonNode createSprint(String name, String start, String end, UUID taskId, int points)
      throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/sprints")
                    .cookie(cookie)
                    .header("X-CSRF-TOKEN", csrf.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createBody(name, start, end, taskId, points)))
            .andExpect(status().isCreated())
            .andExpect(
                header().string("Location", org.hamcrest.Matchers.containsString("/sprints/")))
            .andReturn();
    return mapper.readTree(result.getResponse().getContentAsString());
  }

  private JsonNode command(JsonNode sprint, String command, String content) throws Exception {
    return body(
        post("/sprints/" + sprint.get("id").asText() + "/" + command)
            .cookie(cookie)
            .header("X-CSRF-TOKEN", csrf.value())
            .contentType(MediaType.APPLICATION_JSON)
            .content(content));
  }

  private JsonNode body(
      org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request)
      throws Exception {
    return mapper.readTree(
        mockMvc
            .perform(request)
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  private static String createBody(String name, String start, String end, UUID taskId, int points) {
    String taskJson =
        taskId == null
            ? "[]"
            : "[{\"taskId\":\"" + taskId + "\",\"storyPoints\":" + points + ",\"position\":0}]";
    return "{\"name\":\""
        + name
        + "\",\"goal\":\"Ship safely\",\"startDate\":\""
        + start
        + "\",\"endDate\":\""
        + end
        + "\",\"targetCapacityPoints\":20,\"tasks\":"
        + taskJson
        + "}";
  }

  private UUID createUser(String prefix) {
    return users
        .save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of(prefix + "-" + UUID.randomUUID() + "@example.test"),
                    "Sprint Tester",
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
}
