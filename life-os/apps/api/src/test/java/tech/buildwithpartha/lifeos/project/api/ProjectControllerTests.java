package tech.buildwithpartha.lifeos.project.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
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
import tech.buildwithpartha.lifeos.label.domain.Label;
import tech.buildwithpartha.lifeos.label.domain.LabelRepository;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class ProjectControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final LabelRepository labelRepository;
  private final ProjectRepository projectRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private RawToken sessionToken;
  private RawToken csrfToken;
  private Cookie sessionCookie;

  private UUID otherUserId;

  @Autowired
  ProjectControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      LabelRepository labelRepository,
      ProjectRepository projectRepository,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.labelRepository = labelRepository;
    this.projectRepository = projectRepository;
    this.tokenGenerator = tokenGenerator;
  }

  @BeforeEach
  void setUp() {
    userId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("project-test-" + UUID.randomUUID() + "@example.test"),
                        "Project Tester",
                        Instant.now())
                    .verify(Instant.now()))
            .id();

    otherUserId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("other-test-" + UUID.randomUUID() + "@example.test"),
                        "Other Tester",
                        Instant.now())
                    .verify(Instant.now()))
            .id();

    sessionToken = tokenGenerator.generate();
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

  private Label createLabelFor(UUID ownerId, String name) {
    return labelRepository.save(
        new Label(
            UUID.randomUUID(),
            ownerId,
            name,
            name.toLowerCase(),
            "blue",
            Instant.now(),
            Instant.now(),
            0L));
  }

  private Project saveProjectFor(UUID ownerId, String name) {
    return projectRepository.save(
        new Project(
            UUID.randomUUID(),
            ownerId,
            name,
            Optional.empty(),
            ProjectStatus.PLANNED,
            ProjectPriority.P2,
            ProjectHealth.NOT_SET,
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

  @Test
  void createProjectRequiresAuthentication() throws Exception {
    mockMvc.perform(post("/projects")).andExpect(status().isUnauthorized());
  }

  @Test
  void createProjectRequiresCsrfToken() throws Exception {
    String body =
        """
        {
          "name": "New Project"
        }
        """;
    mockMvc
        .perform(
            post("/projects")
                .cookie(sessionCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("CSRF_TOKEN_INVALID"));
  }

  @Test
  void createProjectSuccessfulWithDefaults() throws Exception {
    Label userLabel = createLabelFor(userId, "Personal");
    String body =
        String.format(
            """
        {
          "name": "My Epic Project",
          "description": "Some description",
          "labelIds": ["%s"]
        }
        """,
            userLabel.id());

    mockMvc
        .perform(
            post("/projects")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").exists())
        .andExpect(jsonPath("$.name").value("My Epic Project"))
        .andExpect(jsonPath("$.description").value("Some description"))
        .andExpect(jsonPath("$.status").value("PLANNED"))
        .andExpect(jsonPath("$.priority").value("P2"))
        .andExpect(jsonPath("$.health").value("NOT_SET"))
        .andExpect(jsonPath("$.labelIds[0]").value(userLabel.id().toString()))
        .andExpect(jsonPath("$.version").isNumber());
  }

  @Test
  void createProjectRejectsInvalidEnumValues() throws Exception {
    String body =
        """
        {
          "name": "Project",
          "status": "SUPER_STATUS"
        }
        """;

    mockMvc
        .perform(
            post("/projects")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("status"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID"));
  }

  @Test
  void createProjectRejectsInvalidDeadlineRange() throws Exception {
    String body =
        """
        {
          "name": "Project",
          "startDate": "2026-08-20",
          "deadlineDate": "2026-08-19"
        }
        """;

    mockMvc
        .perform(
            post("/projects")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("deadlineDate"))
        .andExpect(jsonPath("$.errors[0].code").value("Range"));
  }

  @Test
  void createProjectRejectsOtherUserLabels() throws Exception {
    Label otherLabel = createLabelFor(otherUserId, "Secret");
    String body =
        String.format(
            """
        {
          "name": "Project",
          "labelIds": ["%s"]
        }
        """,
            otherLabel.id());

    mockMvc
        .perform(
            post("/projects")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("labelIds"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID_LABEL"));
  }

  @Test
  void getProjectReturnsDetailsWhenOwned() throws Exception {
    Project project = saveProjectFor(userId, "Owned Project");

    mockMvc
        .perform(get("/projects/" + project.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(project.id().toString()))
        .andExpect(jsonPath("$.name").value("Owned Project"));
  }

  @Test
  void getProjectReturnsNotFoundForOtherUserProject() throws Exception {
    Project otherProject = saveProjectFor(otherUserId, "Secret Project");

    mockMvc
        .perform(get("/projects/" + otherProject.id()).cookie(sessionCookie))
        .andExpect(status().isNotFound());
  }

  @Test
  void updateProjectSuccessful() throws Exception {
    Project project = saveProjectFor(userId, "Project V0");
    String body =
        String.format(
            """
        {
          "name": "Project V1",
          "description": "Updated Description",
          "status": "ACTIVE",
          "priority": "P1",
          "health": "ON_TRACK",
          "version": %d
        }
        """,
            project.version());

    mockMvc
        .perform(
            put("/projects/" + project.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Project V1"))
        .andExpect(jsonPath("$.description").value("Updated Description"))
        .andExpect(jsonPath("$.status").value("ACTIVE"))
        .andExpect(jsonPath("$.priority").value("P1"))
        .andExpect(jsonPath("$.health").value("ON_TRACK"))
        .andExpect(jsonPath("$.version").isNumber());
  }

  @Test
  void updateProjectRejectsVersionMismatch() throws Exception {
    Project project = saveProjectFor(userId, "Project V0");
    String body =
        String.format(
            """
        {
          "name": "Project V1",
          "version": %d
        }
        """,
            project.version() + 99);

    mockMvc
        .perform(
            put("/projects/" + project.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CONCURRENCY_CONFLICT"));
  }

  @Test
  void updateProjectReturnsNotFoundForOtherUserProject() throws Exception {
    Project otherProject = saveProjectFor(otherUserId, "Secret Project");
    String body =
        String.format(
            """
        {
          "name": "Hacked",
          "version": %d
        }
        """,
            otherProject.version());

    mockMvc
        .perform(
            put("/projects/" + otherProject.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isNotFound());
  }

  @Test
  void archiveAndRestoreProjectLifecycle() throws Exception {
    Project project = saveProjectFor(userId, "Lifecycle Project");

    // 1. Archive
    String archiveBody =
        String.format(
            """
        {
          "version": %d
        }
        """,
            project.version());

    mockMvc
        .perform(
            post("/projects/" + project.id() + "/archive")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(archiveBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archivedAt").exists())
        .andExpect(jsonPath("$.version").isNumber());

    // Get project should show it is archived
    Project archivedProject = projectRepository.findById(project.id()).orElseThrow();

    // 2. Restore
    String restoreBody =
        String.format(
            """
        {
          "version": %d
        }
        """,
            archivedProject.version());

    mockMvc
        .perform(
            post("/projects/" + project.id() + "/restore")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(restoreBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archivedAt").isEmpty())
        .andExpect(jsonPath("$.version").isNumber());
  }

  @Test
  void archiveProjectRejectsVersionMismatch() throws Exception {
    Project project = saveProjectFor(userId, "Optimistic Locking Project");
    String body =
        String.format(
            """
        {
          "version": %d
        }
        """,
            project.version() + 99);

    mockMvc
        .perform(
            post("/projects/" + project.id() + "/archive")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isConflict());
  }

  @Test
  void deleteProjectSuccessful() throws Exception {
    Project project = saveProjectFor(userId, "Project to delete");

    mockMvc
        .perform(
            delete("/projects/" + project.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNoContent());

    Optional<Project> deleted = projectRepository.findById(project.id());
    org.assertj.core.api.Assertions.assertThat(deleted).isEmpty();
  }

  @Test
  void deleteProjectReturnsNotFoundForOtherUserProject() throws Exception {
    Project otherProject = saveProjectFor(otherUserId, "Secret Project");

    mockMvc
        .perform(
            delete("/projects/" + otherProject.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNotFound());
  }

}
