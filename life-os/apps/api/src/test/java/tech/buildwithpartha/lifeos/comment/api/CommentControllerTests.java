package tech.buildwithpartha.lifeos.comment.api;

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
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
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
import tech.buildwithpartha.lifeos.comment.application.CommentService;
import tech.buildwithpartha.lifeos.comment.domain.Comment;
import tech.buildwithpartha.lifeos.comment.domain.CommentFormat;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityPort;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;
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
class CommentControllerTests {

  @Autowired private MockMvc mockMvc;
  @Autowired private UserRepository userRepository;
  @Autowired private SessionRepository sessionRepository;
  @Autowired private SecureTokenGenerator tokenGenerator;
  @Autowired private TaskRepository taskRepository;
  @Autowired private ProjectRepository projectRepository;
  @Autowired private CommentService commentService;
  @Autowired private ProductActivityPort activityPort;

  private UUID userId;
  private UUID otherUserId;
  private Task task;
  private Task otherTask;
  private Project project;
  private Project otherProject;
  private RawToken csrfToken;
  private Cookie sessionCookie;

  @BeforeEach
  void setUp() {
    Instant now = Instant.now();
    userId = createUser("comment-owner-", "Comment Owner", now);
    otherUserId = createUser("comment-other-", "Comment Other", now);
    task = taskRepository.save(task(userId, "Owner Task", now));
    otherTask = taskRepository.save(task(otherUserId, "Other Task", now));
    project = projectRepository.save(project(userId, "Owner Project", now));
    otherProject = projectRepository.save(project(otherUserId, "Other Project", now));

    RawToken sessionToken = tokenGenerator.generate();
    csrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userId,
            sessionToken.hash(),
            csrfToken.hash(),
            now,
            Optional.empty()));
    sessionCookie = new Cookie("lifeos_session", sessionToken.value());
  }

  @Test
  void taskCommentCrudUpdatesDetailCountsAndEmitsActivity() throws Exception {
    String createBody =
        """
        {"body":"First line\\nSecond line"}
        """;

    mockMvc
        .perform(
            post("/tasks/{taskId}/comments", task.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody))
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", org.hamcrest.Matchers.containsString("/comments/")))
        .andExpect(jsonPath("$.body").value("First line\nSecond line"))
        .andExpect(jsonPath("$.format").value("PLAIN_TEXT"))
        .andExpect(jsonPath("$.version").value(0))
        .andExpect(jsonPath("$.canEdit").value(true))
        .andExpect(jsonPath("$.canDelete").value(true));

    Comment comment =
        commentService.list(userId, CommentParentType.TASK, task.id(), 0, 20).items().getFirst();

    mockMvc
        .perform(
            get("/tasks/{taskId}/comments/{commentId}", task.id(), comment.id())
                .cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(comment.id().toString()));

    mockMvc
        .perform(get("/tasks/{taskId}/comments", task.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items.length()").value(1))
        .andExpect(jsonPath("$.totalItems").value(1));

    mockMvc
        .perform(
            put("/tasks/{taskId}/comments/{commentId}", task.id(), comment.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"Edited\",\"format\":\"PLAIN_TEXT\",\"version\":0}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.body").value("Edited"))
        .andExpect(jsonPath("$.editedAt").exists())
        .andExpect(jsonPath("$.version").value(1));

    mockMvc
        .perform(get("/tasks/{taskId}/detail", task.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.counts.commentCount").value(1))
        .andExpect(jsonPath("$.counts.activityEventCount").value(2));

    mockMvc
        .perform(
            delete("/tasks/{taskId}/comments/{commentId}", task.id(), comment.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .header("If-Match", 1))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            get("/tasks/{taskId}/comments/{commentId}", task.id(), comment.id())
                .cookie(sessionCookie))
        .andExpect(status().isNotFound());
    org.assertj.core.api.Assertions.assertThat(
            activityPort.countBySubject(userId, ActivitySubjectType.TASK, task.id()))
        .isEqualTo(3);
  }

  @Test
  void markdownIsSanitizedBeforeStorageAndResponse() throws Exception {
    mockMvc
        .perform(
            post("/tasks/{taskId}/comments", task.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"body\":\"<script>bad</script> [run](javascript:alert(1)) "
                        + "![pixel](https://track.example/p)\",\"format\":\"MARKDOWN\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.body").value("&lt;script&gt;bad&lt;/script&gt; run pixel"))
        .andExpect(jsonPath("$.format").value("MARKDOWN"));
  }

  @Test
  void projectCommentsUseTheSameOwnerScopedContract() throws Exception {
    mockMvc
        .perform(
            post("/projects/{projectId}/comments", project.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"Project note\",\"format\":\"PLAIN_TEXT\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.parentType").value("PROJECT"))
        .andExpect(jsonPath("$.parentId").value(project.id().toString()));

    mockMvc
        .perform(get("/projects/{projectId}/comments", project.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].body").value("Project note"));
  }

  @Test
  void unauthenticatedAndMissingCsrfRequestsAreRejected() throws Exception {
    mockMvc
        .perform(get("/tasks/{taskId}/comments", task.id()))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));

    mockMvc
        .perform(
            post("/tasks/{taskId}/comments", task.id())
                .cookie(sessionCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"No CSRF\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("CSRF_TOKEN_INVALID"));
  }

  @Test
  void crossUserParentsAreIndistinguishableFromMissingForReadsAndWrites() throws Exception {
    mockMvc
        .perform(get("/tasks/{taskId}/comments", otherTask.id()).cookie(sessionCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    mockMvc
        .perform(
            post("/projects/{projectId}/comments", otherProject.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"Cross user\"}"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
  }

  @Test
  void validationAndStaleVersionsReturnSafeProblems() throws Exception {
    mockMvc
        .perform(
            post("/tasks/{taskId}/comments", task.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"   \"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("body"));

    Comment comment =
        commentService.create(
            userId, CommentParentType.TASK, task.id(), "Current", CommentFormat.PLAIN_TEXT);
    mockMvc
        .perform(
            delete("/tasks/{taskId}/comments/{commentId}", task.id(), comment.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("If-Match"));
    mockMvc
        .perform(
            put("/tasks/{taskId}/comments/{commentId}", task.id(), comment.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"Stale\",\"format\":\"PLAIN_TEXT\",\"version\":9}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CONCURRENCY_CONFLICT"));
  }

  private UUID createUser(String prefix, String displayName, Instant now) {
    return userRepository
        .save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of(prefix + UUID.randomUUID() + "@example.test"),
                    displayName,
                    now)
                .verify(now))
        .id();
  }

  private static Task task(UUID owner, String title, Instant now) {
    return new Task(
        UUID.randomUUID(),
        owner,
        Optional.empty(),
        title,
        Optional.empty(),
        TaskStatus.TO_DO,
        TaskPriority.P2,
        Optional.empty(),
        30,
        0,
        0,
        Optional.empty(),
        0,
        Optional.empty(),
        Optional.empty(),
        now,
        now,
        List.of(),
        0);
  }

  private static Project project(UUID owner, String name, Instant now) {
    return new Project(
        UUID.randomUUID(),
        owner,
        name,
        Optional.empty(),
        ProjectStatus.ACTIVE,
        ProjectPriority.P2,
        ProjectHealth.NOT_SET,
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        now,
        now,
        Set.of(),
        0);
  }
}
