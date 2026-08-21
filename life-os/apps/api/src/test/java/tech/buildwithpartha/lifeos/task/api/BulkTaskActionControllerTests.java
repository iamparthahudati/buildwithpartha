package tech.buildwithpartha.lifeos.task.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.label.domain.Label;
import tech.buildwithpartha.lifeos.label.domain.LabelRepository;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class BulkTaskActionControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final TaskRepository taskRepository;
  private final ProjectRepository projectRepository;
  private final LabelRepository labelRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private UUID otherUserId;
  private RawToken csrfToken;
  private Cookie sessionCookie;

  @Autowired
  BulkTaskActionControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      TaskRepository taskRepository,
      ProjectRepository projectRepository,
      LabelRepository labelRepository,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.taskRepository = taskRepository;
    this.projectRepository = projectRepository;
    this.labelRepository = labelRepository;
    this.tokenGenerator = tokenGenerator;
  }

  @BeforeEach
  void setUp() {
    userId = createUser("bulk-task");
    otherUserId = createUser("bulk-task-other");

    RawToken sessionToken = tokenGenerator.generate();
    csrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userId,
            sessionToken.hash(),
            csrfToken.hash(),
            Instant.now(),
            Optional.empty()));
    sessionCookie = new Cookie("lifeos_session", sessionToken.value());
  }

  @Test
  void supportsEveryBulkActionAndRetryingAnAppliedActionIsANoOp() throws Exception {
    Task task = saveTask(userId, "Selected task", Optional.of(LocalDate.of(2026, 8, 21)));
    Project project = saveProject(userId, "Bulk destination");
    Label label = saveLabel(userId, "Bulk label");

    performBulk(task.id(), "\"action\": \"PRIORITY\", \"priority\": \"P1\"")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.results[0].task.priority").value("P1"));

    performBulk(task.id(), "\"action\": \"PROJECT\", \"projectId\": \"" + project.id() + "\"")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.results[0].task.projectId").value(project.id().toString()));

    performBulk(task.id(), "\"action\": \"ADD_LABEL\", \"labelId\": \"" + label.id() + "\"")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.results[0].task.labelIds[0]").value(label.id().toString()));

    performBulk(task.id(), "\"action\": \"SCHEDULE\", \"dueAt\": \"2026-08-25T09:30:00Z\"")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.results[0].task.dueAt").value("2026-08-25T09:30:00Z"));

    performBulk(task.id(), "\"action\": \"CLEAR_SCHEDULE\"")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.results[0].task.dueAt").isEmpty());

    performBulk(task.id(), "\"action\": \"REMOVE_LABEL\", \"labelId\": \"" + label.id() + "\"")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.results[0].task.labelIds").isEmpty());

    performBulk(task.id(), "\"action\": \"PROJECT\"")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.results[0].task.projectId").isEmpty());

    performBulk(task.id(), "\"action\": \"STATUS\", \"status\": \"DONE\"")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.results[0].task.status").value("DONE"))
        .andExpect(jsonPath("$.results[0].task.progress").value(100))
        .andExpect(jsonPath("$.results[0].task.mitDate").isEmpty());

    long completedVersion = taskRepository.findById(task.id()).orElseThrow().version();
    performBulk(task.id(), "\"action\": \"STATUS\", \"status\": \"DONE\"")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.succeeded").value(1))
        .andExpect(jsonPath("$.results[0].task.version").value(completedVersion));
    assertThat(taskRepository.findById(task.id()).orElseThrow().version())
        .isEqualTo(completedVersion);

    performBulk(task.id(), "\"action\": \"ARCHIVE\"")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.results[0].task.archived").value(true));
    long archivedVersion = taskRepository.findById(task.id()).orElseThrow().version();
    performBulk(task.id(), "\"action\": \"ARCHIVE\"")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.results[0].task.version").value(archivedVersion));
    assertThat(taskRepository.findById(task.id()).orElseThrow().version())
        .isEqualTo(archivedVersion);
  }

  @Test
  void returnsOrderedPartialResultsWithoutRollingBackSuccessfulItems() throws Exception {
    Task ownedTask = saveTask(userId, "Owned task", Optional.empty());
    Task otherTask = saveTask(otherUserId, "Private task", Optional.empty());
    UUID missingTaskId = UUID.randomUUID();
    String body =
        String.format(
            """
            {
              "taskIds": ["%s", "%s", "%s"],
              "action": "STATUS",
              "status": "IN_PROGRESS"
            }
            """,
            ownedTask.id(), otherTask.id(), missingTaskId);

    performBulk(body)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.requested").value(3))
        .andExpect(jsonPath("$.succeeded").value(1))
        .andExpect(jsonPath("$.failed").value(2))
        .andExpect(jsonPath("$.results[0].taskId").value(ownedTask.id().toString()))
        .andExpect(jsonPath("$.results[0].outcome").value("SUCCEEDED"))
        .andExpect(jsonPath("$.results[1].taskId").value(otherTask.id().toString()))
        .andExpect(jsonPath("$.results[1].outcome").value("FAILED"))
        .andExpect(jsonPath("$.results[1].errorCode").value("RESOURCE_NOT_FOUND"))
        .andExpect(jsonPath("$.results[2].taskId").value(missingTaskId.toString()))
        .andExpect(jsonPath("$.results[2].errorCode").value("RESOURCE_NOT_FOUND"));

    assertThat(taskRepository.findById(ownedTask.id()).orElseThrow().status())
        .isEqualTo(TaskStatus.IN_PROGRESS);
    assertThat(taskRepository.findById(otherTask.id()).orElseThrow().status())
        .isEqualTo(TaskStatus.TO_DO);
  }

  @Test
  void rejectsCrossUserProjectAndLabelReferencesPerItem() throws Exception {
    Task task = saveTask(userId, "Owned task", Optional.empty());
    Project otherProject = saveProject(otherUserId, "Private project");
    Label otherLabel = saveLabel(otherUserId, "Private label");

    performBulk(task.id(), "\"action\": \"PROJECT\", \"projectId\": \"" + otherProject.id() + "\"")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.failed").value(1))
        .andExpect(jsonPath("$.results[0].errorCode").value("VALIDATION_FAILED"));

    performBulk(task.id(), "\"action\": \"ADD_LABEL\", \"labelId\": \"" + otherLabel.id() + "\"")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.failed").value(1))
        .andExpect(jsonPath("$.results[0].errorCode").value("VALIDATION_FAILED"));

    Task unchanged = taskRepository.findById(task.id()).orElseThrow();
    assertThat(unchanged.projectId()).isEmpty();
    assertThat(unchanged.labelIds()).isEmpty();
    assertThat(unchanged.version()).isZero();
  }

  @Test
  void validatesSelectionAndActionSpecificFieldsBeforeMutation() throws Exception {
    UUID taskId = saveTask(userId, "Validation task", Optional.empty()).id();

    performBulk(
            String.format(
                """
                {"taskIds": ["%s", "%s"], "action": "ARCHIVE"}
                """,
                taskId, taskId))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("taskIds"))
        .andExpect(jsonPath("$.errors[0].code").value("DUPLICATE"));

    performBulk(taskId, "\"action\": \"STATUS\"")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("status"))
        .andExpect(jsonPath("$.errors[0].code").value("REQUIRED"));

    performBulk(taskId, "\"action\": \"SCHEDULE\"")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("dueAt"));

    String tooManyIds =
        IntStream.range(0, 101)
            .mapToObj(ignored -> "\"" + UUID.randomUUID() + "\"")
            .collect(Collectors.joining(","));
    performBulk("{\"taskIds\":[" + tooManyIds + "],\"action\":\"ARCHIVE\"}")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("taskIds"));

    assertThat(taskRepository.findById(taskId).orElseThrow().isArchived()).isFalse();
  }

  @Test
  void requiresAuthenticationAndCsrfProtection() throws Exception {
    Task task = saveTask(userId, "Protected task", Optional.empty());
    String body = "{\"taskIds\":[\"" + task.id() + "\"],\"action\":\"ARCHIVE\"}";

    mockMvc
        .perform(post("/tasks/bulk-actions").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/tasks/bulk-actions")
                .cookie(sessionCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("CSRF_TOKEN_INVALID"));
  }

  private UUID createUser(String prefix) {
    return userRepository
        .save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of(prefix + "-" + UUID.randomUUID() + "@example.test"),
                    "Bulk Task Tester",
                    Instant.now())
                .verify(Instant.now()))
        .id();
  }

  private Task saveTask(UUID ownerId, String title, Optional<LocalDate> mitDate) {
    Instant now = Instant.now();
    return taskRepository.save(
        new Task(
            UUID.randomUUID(),
            ownerId,
            Optional.empty(),
            title,
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P3,
            Optional.empty(),
            30,
            0,
            0,
            mitDate,
            0,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            0L));
  }

  private Project saveProject(UUID ownerId, String name) {
    return projectRepository.save(
        new Project(
            UUID.randomUUID(),
            ownerId,
            name,
            Optional.empty(),
            ProjectStatus.ACTIVE,
            ProjectPriority.P2,
            ProjectHealth.ON_TRACK,
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
  }

  private Label saveLabel(UUID ownerId, String name) {
    return labelRepository.save(
        new Label(
            UUID.randomUUID(),
            ownerId,
            name,
            Label.normalizeName(name),
            "#2563EB",
            Instant.now(),
            Instant.now(),
            0L));
  }

  private ResultActions performBulk(UUID taskId, String actionFields) throws Exception {
    return performBulk("{\"taskIds\":[\"" + taskId + "\"]," + actionFields + "}");
  }

  private ResultActions performBulk(String body) throws Exception {
    return mockMvc.perform(
        post("/tasks/bulk-actions")
            .cookie(sessionCookie)
            .header("X-CSRF-TOKEN", csrfToken.value())
            .contentType(MediaType.APPLICATION_JSON)
            .content(body));
  }
}
