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
  void createProjectPersistsCoverImageUrl() throws Exception {
    String body =
        """
        {
          "name": "Cover Project",
          "coverImageUrl": "https://example.test/covers/hero.jpg"
        }
        """;

    mockMvc
        .perform(
            post("/projects")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.coverImageUrl").value("https://example.test/covers/hero.jpg"));
  }

  @Test
  void createProjectRejectsInvalidCoverImageUrl() throws Exception {
    String body =
        """
        {
          "name": "Bad Cover",
          "coverImageUrl": "javascript:alert(1)"
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
        .andExpect(jsonPath("$.errors[0].field").value("coverImageUrl"));
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
  void getProjectDetailReturnsAggregatedDetailsWhenOwned() throws Exception {
    Project project = saveProjectFor(userId, "Detailed Project");

    mockMvc
        .perform(get("/projects/" + project.id() + "/detail").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.project.id").value(project.id().toString()))
        .andExpect(jsonPath("$.project.name").value("Detailed Project"))
        .andExpect(jsonPath("$.milestones").isArray());
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

  private Project saveProjectWithDetails(
      UUID ownerId,
      String name,
      String description,
      ProjectStatus status,
      ProjectPriority priority,
      ProjectHealth health,
      Set<UUID> labelIds,
      LocalDate deadline,
      Instant archivedAt) {
    return projectRepository.save(
        new Project(
            UUID.randomUUID(),
            ownerId,
            name,
            Optional.ofNullable(description),
            status,
            priority,
            health,
            Optional.of("blue"),
            Optional.of("star"),
            Optional.empty(),
            Optional.of(LocalDate.now().minusDays(5)),
            Optional.ofNullable(deadline),
            Optional.of(60),
            Optional.ofNullable(archivedAt),
            Instant.now(),
            Instant.now(),
            labelIds != null ? labelIds : Set.of(),
            0L));
  }

  @Test
  void queryProjectsRequiresAuthentication() throws Exception {
    mockMvc.perform(get("/projects")).andExpect(status().isUnauthorized());
  }

  @Test
  void queryProjectsSuccessfulWithFilters() throws Exception {
    Label label1 = createLabelFor(userId, "LabelOne");
    Label label2 = createLabelFor(userId, "LabelTwo");

    Project p1 =
        saveProjectWithDetails(
            userId,
            "Alpha Project",
            "Special alpha task",
            ProjectStatus.ACTIVE,
            ProjectPriority.P1,
            ProjectHealth.ON_TRACK,
            Set.of(label1.id()),
            LocalDate.of(2026, 9, 1),
            null);
    Project p2 =
        saveProjectWithDetails(
            userId,
            "Beta Project",
            "Normal beta task",
            ProjectStatus.PLANNED,
            ProjectPriority.P2,
            ProjectHealth.AT_RISK,
            Set.of(label2.id()),
            LocalDate.of(2026, 10, 1),
            null);
    Project p3 =
        saveProjectWithDetails(
            userId,
            "Gamma Project",
            "Alpha version",
            ProjectStatus.COMPLETED,
            ProjectPriority.P3,
            ProjectHealth.OFF_TRACK,
            Set.of(label1.id(), label2.id()),
            LocalDate.of(2026, 11, 1),
            null);

    // 1. Filter by status
    mockMvc
        .perform(get("/projects?status=ACTIVE").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items.length()").value(1))
        .andExpect(jsonPath("$.page.items[0].id").value(p1.id().toString()));

    // 2. Filter by priority and health
    mockMvc
        .perform(get("/projects?priority=P2&health=AT_RISK").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items.length()").value(1))
        .andExpect(jsonPath("$.page.items[0].id").value(p2.id().toString()));

    // 3. Text search q matching description
    mockMvc
        .perform(get("/projects?q=alpha").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items.length()").value(2));

    // 4. Filter by label
    mockMvc
        .perform(get("/projects?labelId=" + label1.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items.length()").value(2));

    // 5. Filter by deadlineBefore
    mockMvc
        .perform(get("/projects?deadlineBefore=2026-10-15").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items.length()").value(2));
  }

  @Test
  void queryProjectsVerifySummaryCounts() throws Exception {
    saveProjectWithDetails(
        userId,
        "P1",
        "D1",
        ProjectStatus.ACTIVE,
        ProjectPriority.P1,
        ProjectHealth.ON_TRACK,
        Set.of(),
        null,
        null);
    saveProjectWithDetails(
        userId,
        "P2",
        "D2",
        ProjectStatus.COMPLETED,
        ProjectPriority.P1,
        ProjectHealth.ON_TRACK,
        Set.of(),
        null,
        null);
    saveProjectWithDetails(
        userId,
        "P3",
        "D3",
        ProjectStatus.ON_HOLD,
        ProjectPriority.P1,
        ProjectHealth.AT_RISK,
        Set.of(),
        null,
        null);
    saveProjectWithDetails(
        userId,
        "P4",
        "D4",
        ProjectStatus.ACTIVE,
        ProjectPriority.P1,
        ProjectHealth.OFF_TRACK,
        Set.of(),
        null,
        null);
    saveProjectWithDetails(
        userId,
        "P5",
        "D5",
        ProjectStatus.ACTIVE,
        ProjectPriority.P1,
        ProjectHealth.AT_RISK,
        Set.of(),
        null,
        Instant.now()); // archived

    mockMvc
        .perform(get("/projects").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.summary.total").value(4))
        .andExpect(jsonPath("$.summary.active").value(2))
        .andExpect(jsonPath("$.summary.completed").value(1))
        .andExpect(jsonPath("$.summary.onHold").value(1))
        .andExpect(jsonPath("$.summary.atRisk").value(2))
        .andExpect(jsonPath("$.summary.averageProgress").value(0));
  }

  @Test
  void queryProjectsStableSort() throws Exception {
    Project p1 =
        saveProjectWithDetails(
            userId,
            "C Project",
            "D",
            ProjectStatus.PLANNED,
            ProjectPriority.P1,
            ProjectHealth.NOT_SET,
            Set.of(),
            null,
            null);
    Project p2 =
        saveProjectWithDetails(
            userId,
            "A Project",
            "D",
            ProjectStatus.PLANNED,
            ProjectPriority.P1,
            ProjectHealth.NOT_SET,
            Set.of(),
            null,
            null);
    Project p3 =
        saveProjectWithDetails(
            userId,
            "B Project",
            "D",
            ProjectStatus.PLANNED,
            ProjectPriority.P1,
            ProjectHealth.NOT_SET,
            Set.of(),
            null,
            null);

    mockMvc
        .perform(get("/projects?sortBy=name&sortDirection=ASC").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items[0].id").value(p2.id().toString()))
        .andExpect(jsonPath("$.page.items[1].id").value(p3.id().toString()))
        .andExpect(jsonPath("$.page.items[2].id").value(p1.id().toString()));
  }

  @Test
  void queryProjectsPagination() throws Exception {
    for (int i = 0; i < 5; i++) {
      saveProjectWithDetails(
          userId,
          "Proj " + i,
          "D",
          ProjectStatus.PLANNED,
          ProjectPriority.P2,
          ProjectHealth.NOT_SET,
          Set.of(),
          null,
          null);
    }

    mockMvc
        .perform(get("/projects?page=0&size=2&sortBy=name&sortDirection=ASC").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items.length()").value(2))
        .andExpect(jsonPath("$.page.totalItems").value(5))
        .andExpect(jsonPath("$.page.totalPages").value(3))
        .andExpect(jsonPath("$.page.page").value(0))
        .andExpect(jsonPath("$.page.size").value(2));

    mockMvc
        .perform(get("/projects?page=2&size=2&sortBy=name&sortDirection=ASC").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items.length()").value(1));
  }

  @Test
  void queryProjectsEnforcesUserIsolation() throws Exception {
    saveProjectWithDetails(
        userId,
        "My Project",
        "D",
        ProjectStatus.ACTIVE,
        ProjectPriority.P2,
        ProjectHealth.NOT_SET,
        Set.of(),
        null,
        null);
    saveProjectWithDetails(
        otherUserId,
        "Other Project",
        "D",
        ProjectStatus.ACTIVE,
        ProjectPriority.P2,
        ProjectHealth.NOT_SET,
        Set.of(),
        null,
        null);

    mockMvc
        .perform(get("/projects").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items.length()").value(1))
        .andExpect(jsonPath("$.page.items[0].name").value("My Project"))
        .andExpect(jsonPath("$.summary.total").value(1));
  }

  @Test
  void queryProjectsRejectsInvalidFilters() throws Exception {
    mockMvc
        .perform(get("/projects?status=INVALID_STATUS").cookie(sessionCookie))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("status"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID"));

    mockMvc
        .perform(get("/projects?priority=INVALID_PRIORITY").cookie(sessionCookie))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("priority"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID"));

    mockMvc
        .perform(get("/projects?health=INVALID_HEALTH").cookie(sessionCookie))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("health"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID"));

    mockMvc
        .perform(get("/projects?sortBy=invalidField").cookie(sessionCookie))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("sortBy"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID"));

    mockMvc
        .perform(get("/projects?page=-1").cookie(sessionCookie))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("page"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID"));

    mockMvc
        .perform(get("/projects?size=150").cookie(sessionCookie))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("size"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID"));

    mockMvc
        .perform(get("/projects?size=0").cookie(sessionCookie))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("size"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID"));

    mockMvc
        .perform(get("/projects?sortDirection=INVALID_DIRECTION").cookie(sessionCookie))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("sortDirection"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID"));
  }

  @Test
  void queryProjectsWithBlankSearchAndNullFilters() throws Exception {
    saveProjectWithDetails(
        userId,
        "Project X",
        "D",
        ProjectStatus.PLANNED,
        ProjectPriority.P2,
        ProjectHealth.NOT_SET,
        Set.of(),
        null,
        null);

    mockMvc
        .perform(get("/projects?q=   &sortDirection=DESC").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items.length()").value(1));
  }

  @Test
  void queryProjectsSuccessfulWithArchivedFilters() throws Exception {
    Project p1 =
        saveProjectWithDetails(
            userId,
            "Active Proj",
            "D",
            ProjectStatus.PLANNED,
            ProjectPriority.P2,
            ProjectHealth.NOT_SET,
            Set.of(),
            null,
            null);
    Project p2 =
        saveProjectWithDetails(
            userId,
            "Archived Proj",
            "D",
            ProjectStatus.PLANNED,
            ProjectPriority.P2,
            ProjectHealth.NOT_SET,
            Set.of(),
            null,
            Instant.now());

    // 1. archived=true
    mockMvc
        .perform(get("/projects?archived=true").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items.length()").value(1))
        .andExpect(jsonPath("$.page.items[0].id").value(p2.id().toString()));

    // 2. archived=null (meaning return all, both active and archived)
    mockMvc
        .perform(get("/projects?archived=").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items.length()").value(2));
  }

  @Test
  void queryProjectsDeadlineAfterOnly() throws Exception {
    Project p1 =
        saveProjectWithDetails(
            userId,
            "Proj A",
            "D",
            ProjectStatus.PLANNED,
            ProjectPriority.P2,
            ProjectHealth.NOT_SET,
            Set.of(),
            LocalDate.of(2026, 9, 1),
            null);
    Project p2 =
        saveProjectWithDetails(
            userId,
            "Proj B",
            "D",
            ProjectStatus.PLANNED,
            ProjectPriority.P2,
            ProjectHealth.NOT_SET,
            Set.of(),
            LocalDate.of(2026, 11, 1),
            null);

    mockMvc
        .perform(get("/projects?deadlineAfter=2026-10-15").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items.length()").value(1))
        .andExpect(jsonPath("$.page.items[0].id").value(p2.id().toString()));
  }
}
