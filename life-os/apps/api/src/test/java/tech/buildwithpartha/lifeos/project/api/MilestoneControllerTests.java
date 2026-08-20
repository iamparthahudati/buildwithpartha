package tech.buildwithpartha.lifeos.project.api;

import static org.assertj.core.api.Assertions.assertThat;
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
import tech.buildwithpartha.lifeos.project.domain.Milestone;
import tech.buildwithpartha.lifeos.project.domain.MilestoneRepository;
import tech.buildwithpartha.lifeos.project.domain.MilestoneStatus;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class MilestoneControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final ProjectRepository projectRepository;
  private final MilestoneRepository milestoneRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private RawToken sessionToken;
  private RawToken csrfToken;
  private Cookie sessionCookie;

  private UUID otherUserId;

  @Autowired
  MilestoneControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      ProjectRepository projectRepository,
      MilestoneRepository milestoneRepository,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.projectRepository = projectRepository;
    this.milestoneRepository = milestoneRepository;
    this.tokenGenerator = tokenGenerator;
  }

  @BeforeEach
  void setUp() {
    userId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("milestone-test-" + UUID.randomUUID() + "@example.test"),
                        "Milestone Tester",
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

  private Project saveProjectFor(
      UUID ownerId, String name, LocalDate startDate, LocalDate deadlineDate) {
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
            Optional.ofNullable(startDate),
            Optional.ofNullable(deadlineDate),
            Optional.empty(),
            Optional.empty(),
            Instant.now(),
            Instant.now(),
            Set.of(),
            0L));
  }

  private Milestone saveMilestoneFor(
      UUID projectId, String title, LocalDate date, MilestoneStatus status, int ordering) {
    return milestoneRepository.save(
        new Milestone(
            UUID.randomUUID(),
            projectId,
            title,
            Optional.ofNullable(date),
            status,
            ordering,
            Instant.now(),
            Instant.now(),
            0L));
  }

  @Test
  void createMilestoneRequiresAuthentication() throws Exception {
    Project project = saveProjectFor(userId, "Project", null, null);
    mockMvc
        .perform(post("/projects/" + project.id() + "/milestones"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void createMilestoneRequiresCsrfToken() throws Exception {
    Project project = saveProjectFor(userId, "Project", null, null);
    String body =
        """
        {
          "title": "New Milestone"
        }
        """;
    mockMvc
        .perform(
            post("/projects/" + project.id() + "/milestones")
                .cookie(sessionCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("CSRF_TOKEN_INVALID"));
  }

  @Test
  void createMilestoneSuccessfulWithDefaults() throws Exception {
    Project project = saveProjectFor(userId, "Project", null, null);
    String body =
        """
        {
          "title": "Milestone A",
          "ordering": 5
        }
        """;

    mockMvc
        .perform(
            post("/projects/" + project.id() + "/milestones")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").exists())
        .andExpect(jsonPath("$.projectId").value(project.id().toString()))
        .andExpect(jsonPath("$.title").value("Milestone A"))
        .andExpect(jsonPath("$.date").isEmpty())
        .andExpect(jsonPath("$.status").value("PLANNED"))
        .andExpect(jsonPath("$.ordering").value(5))
        .andExpect(jsonPath("$.version").value(0));
  }

  @Test
  void createMilestoneRejectsInvalidStatus() throws Exception {
    Project project = saveProjectFor(userId, "Project", null, null);
    String body =
        """
        {
          "title": "Milestone A",
          "status": "SUPER_STATUS"
        }
        """;

    mockMvc
        .perform(
            post("/projects/" + project.id() + "/milestones")
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
  void createMilestoneRejectsInvalidOrdering() throws Exception {
    Project project = saveProjectFor(userId, "Project", null, null);
    String body =
        """
        {
          "title": "Milestone A",
          "ordering": -1
        }
        """;

    mockMvc
        .perform(
            post("/projects/" + project.id() + "/milestones")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("ordering"));
  }

  @Test
  void createMilestoneRejectsInvalidDeadlineRange() throws Exception {
    LocalDate start = LocalDate.of(2026, 8, 1);
    LocalDate deadline = LocalDate.of(2026, 8, 15);
    Project project = saveProjectFor(userId, "Dated Project", start, deadline);

    // 1. Date before start date
    String bodyBefore =
        """
        {
          "title": "Too Early",
          "date": "2026-07-31"
        }
        """;

    mockMvc
        .perform(
            post("/projects/" + project.id() + "/milestones")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(bodyBefore))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("date"))
        .andExpect(jsonPath("$.errors[0].code").value("Range"));

    // 2. Date after deadline date
    String bodyAfter =
        """
        {
          "title": "Too Late",
          "date": "2026-08-16"
        }
        """;

    mockMvc
        .perform(
            post("/projects/" + project.id() + "/milestones")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(bodyAfter))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("date"))
        .andExpect(jsonPath("$.errors[0].code").value("Range"));
  }

  @Test
  void createMilestoneReturnsNotFoundForOtherUserProject() throws Exception {
    Project otherProject = saveProjectFor(otherUserId, "Secret Project", null, null);
    String body =
        """
        {
          "title": "Milestone A"
        }
        """;

    mockMvc
        .perform(
            post("/projects/" + otherProject.id() + "/milestones")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isNotFound());
  }

  @Test
  void getMilestonesReturnsListWhenOwned() throws Exception {
    Project project = saveProjectFor(userId, "Project", null, null);
    saveMilestoneFor(project.id(), "Milestone 2", null, MilestoneStatus.PLANNED, 10);
    saveMilestoneFor(project.id(), "Milestone 1", null, MilestoneStatus.PLANNED, 5);

    mockMvc
        .perform(get("/projects/" + project.id() + "/milestones").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].title").value("Milestone 1")) // sorted by ordering
        .andExpect(jsonPath("$[1].title").value("Milestone 2"));
  }

  @Test
  void getMilestonesReturnsNotFoundForOtherUserProject() throws Exception {
    Project otherProject = saveProjectFor(otherUserId, "Secret Project", null, null);

    mockMvc
        .perform(get("/projects/" + otherProject.id() + "/milestones").cookie(sessionCookie))
        .andExpect(status().isNotFound());
  }

  @Test
  void updateMilestoneSuccessful() throws Exception {
    Project project = saveProjectFor(userId, "Project", null, null);
    Milestone milestone =
        saveMilestoneFor(project.id(), "Milestone V0", null, MilestoneStatus.PLANNED, 0);

    String body =
        String.format(
            """
        {
          "title": "Milestone V1",
          "date": "2026-08-20",
          "status": "COMPLETED",
          "ordering": 2,
          "version": %d
        }
        """,
            milestone.version());

    mockMvc
        .perform(
            put("/projects/" + project.id() + "/milestones/" + milestone.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Milestone V1"))
        .andExpect(jsonPath("$.date").value("2026-08-20"))
        .andExpect(jsonPath("$.status").value("COMPLETED"))
        .andExpect(jsonPath("$.ordering").value(2))
        .andExpect(jsonPath("$.version").isNumber());
  }

  @Test
  void updateMilestoneRejectsVersionMismatch() throws Exception {
    Project project = saveProjectFor(userId, "Project", null, null);
    Milestone milestone =
        saveMilestoneFor(project.id(), "Milestone V0", null, MilestoneStatus.PLANNED, 0);

    String body =
        String.format(
            """
        {
          "title": "Milestone V1",
          "status": "COMPLETED",
          "ordering": 2,
          "version": %d
        }
        """,
            milestone.version() + 99);

    mockMvc
        .perform(
            put("/projects/" + project.id() + "/milestones/" + milestone.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CONCURRENCY_CONFLICT"));
  }

  @Test
  void updateMilestoneReturnsNotFoundForOtherUserProject() throws Exception {
    Project otherProject = saveProjectFor(otherUserId, "Secret", null, null);
    Milestone milestone =
        saveMilestoneFor(otherProject.id(), "Milestone V0", null, MilestoneStatus.PLANNED, 0);

    String body =
        String.format(
            """
        {
          "title": "Hacked",
          "status": "COMPLETED",
          "ordering": 2,
          "version": %d
        }
        """,
            milestone.version());

    mockMvc
        .perform(
            put("/projects/" + otherProject.id() + "/milestones/" + milestone.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isNotFound());
  }

  @Test
  void updateMilestoneStatusSuccessful() throws Exception {
    Project project = saveProjectFor(userId, "Project", null, null);
    Milestone milestone =
        saveMilestoneFor(project.id(), "Milestone", null, MilestoneStatus.PLANNED, 0);

    String body =
        String.format(
            """
        {
          "status": "CANCELLED",
          "version": %d
        }
        """,
            milestone.version());

    mockMvc
        .perform(
            put("/projects/" + project.id() + "/milestones/" + milestone.id() + "/status")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CANCELLED"))
        .andExpect(jsonPath("$.version").isNumber());
  }

  @Test
  void deleteMilestoneSuccessful() throws Exception {
    Project project = saveProjectFor(userId, "Project", null, null);
    Milestone milestone =
        saveMilestoneFor(project.id(), "Milestone", null, MilestoneStatus.PLANNED, 0);

    mockMvc
        .perform(
            delete("/projects/" + project.id() + "/milestones/" + milestone.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNoContent());

    assertThat(milestoneRepository.findById(milestone.id())).isEmpty();
  }

  @Test
  void deleteMilestoneReturnsNotFoundForOtherUserProject() throws Exception {
    Project otherProject = saveProjectFor(otherUserId, "Secret", null, null);
    Milestone milestone =
        saveMilestoneFor(otherProject.id(), "Milestone", null, MilestoneStatus.PLANNED, 0);

    mockMvc
        .perform(
            delete("/projects/" + otherProject.id() + "/milestones/" + milestone.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNotFound());
  }
}
