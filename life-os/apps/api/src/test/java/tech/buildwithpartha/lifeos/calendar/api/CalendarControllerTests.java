package tech.buildwithpartha.lifeos.calendar.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
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
import tech.buildwithpartha.lifeos.project.domain.Milestone;
import tech.buildwithpartha.lifeos.project.domain.MilestoneRepository;
import tech.buildwithpartha.lifeos.project.domain.MilestoneStatus;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class CalendarControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final ProjectRepository projectRepository;
  private final MilestoneRepository milestoneRepository;
  private final TaskRepository taskRepository;
  private final TimeBlockRepository timeBlockRepository;

  private UUID userId;
  private Cookie sessionCookie;

  @Autowired
  CalendarControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator,
      ProjectRepository projectRepository,
      MilestoneRepository milestoneRepository,
      TaskRepository taskRepository,
      TimeBlockRepository timeBlockRepository) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
    this.projectRepository = projectRepository;
    this.milestoneRepository = milestoneRepository;
    this.taskRepository = taskRepository;
    this.timeBlockRepository = timeBlockRepository;
  }

  @BeforeEach
  void setUp() {
    userId = createUser("calendar-owner-");
    RawToken sessionToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userId,
            sessionToken.hash(),
            tokenGenerator.generate().hash(),
            Instant.now(),
            Optional.empty()));
    sessionCookie = new Cookie("lifeos_session", sessionToken.value());
  }

  @Test
  void returnsMergedCanonicalEventsAndExcludesOtherUsersRecords() throws Exception {
    UUID projectId = saveProject(userId, "Calendar Project").id();
    UUID taskId = saveTask(userId, projectId, "Due Task", "2026-08-24T08:30:00Z").id();
    UUID milestoneId =
        saveMilestone(projectId, "Project checkpoint", LocalDate.of(2026, 8, 24)).id();
    UUID blockId = saveBlock(userId, projectId, taskId, "Focus block", "2026-08-24T09:00:00Z").id();

    UUID otherUserId = createUser("calendar-other-");
    UUID otherProjectId = saveProject(otherUserId, "Other Project").id();
    saveTask(otherUserId, otherProjectId, "Private Due Task", "2026-08-24T08:00:00Z");
    saveMilestone(otherProjectId, "Private milestone", LocalDate.of(2026, 8, 24));
    saveBlock(otherUserId, otherProjectId, null, "Private block", "2026-08-24T07:00:00Z");

    mockMvc
        .perform(
            get("/calendar/events")
                .cookie(sessionCookie)
                .param("startDate", "2026-08-24")
                .param("endDate", "2026-08-24")
                .param("timeZone", "UTC"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.timeZone").value("UTC"))
        .andExpect(jsonPath("$.truncated").value(false))
        .andExpect(jsonPath("$.events.length()").value(3))
        .andExpect(jsonPath("$.events[0].id").value("MILESTONE:" + milestoneId))
        .andExpect(jsonPath("$.events[0].sourceId").value(milestoneId.toString()))
        .andExpect(jsonPath("$.events[0].allDay").value(true))
        .andExpect(jsonPath("$.events[1].id").value("TASK_DUE:" + taskId))
        .andExpect(jsonPath("$.events[2].id").value("TIME_BLOCK:" + blockId));
  }

  @Test
  void appliesSourceFilterAndTimezoneDateBoundaries() throws Exception {
    saveTask(userId, null, "Inside Kolkata day", "2026-08-23T20:00:00Z");
    saveTask(userId, null, "Outside Kolkata day", "2026-08-24T19:00:00Z");
    saveBlock(userId, null, null, "Ignored block", "2026-08-23T20:30:00Z");

    mockMvc
        .perform(
            get("/calendar/events")
                .cookie(sessionCookie)
                .param("startDate", "2026-08-24")
                .param("endDate", "2026-08-24")
                .param("timeZone", "Asia/Kolkata")
                .param("source", "task_due"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.events.length()").value(1))
        .andExpect(jsonPath("$.events[0].title").value("Inside Kolkata day"))
        .andExpect(jsonPath("$.events[0].sourceType").value("TASK_DUE"));
  }

  @Test
  void excludesArchivedAndDeletedCanonicalRecords() throws Exception {
    Instant lifecycleAt = Instant.parse("2026-08-23T00:00:00Z");
    Project archivedProject = saveProject(userId, "Archived Project");
    projectRepository.save(archivedProject.archive(lifecycleAt, lifecycleAt));
    saveMilestone(archivedProject.id(), "Archived Project milestone", LocalDate.of(2026, 8, 24));

    Task archivedTask = saveTask(userId, null, "Archived Task", "2026-08-24T08:00:00Z");
    taskRepository.save(archivedTask.archive(lifecycleAt, lifecycleAt));
    Task deletedTask = saveTask(userId, null, "Deleted Task", "2026-08-24T09:00:00Z");
    taskRepository.save(deletedTask.softDelete(lifecycleAt, lifecycleAt));

    mockMvc
        .perform(
            get("/calendar/events")
                .cookie(sessionCookie)
                .param("startDate", "2026-08-24")
                .param("endDate", "2026-08-24")
                .param("timeZone", "UTC"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.events.length()").value(0));
  }

  @Test
  void rejectsInvalidQueryValuesAndRequiresAuthentication() throws Exception {
    mockMvc
        .perform(
            get("/calendar/events")
                .cookie(sessionCookie)
                .param("startDate", "2026-08-24")
                .param("endDate", "2026-08-24")
                .param("timeZone", "Mars/Olympus"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("timeZone"));

    mockMvc
        .perform(
            get("/calendar/events")
                .cookie(sessionCookie)
                .param("startDate", "2026-08-24")
                .param("endDate", "2026-08-24")
                .param("timeZone", "UTC")
                .param("source", "external"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("source"));

    mockMvc
        .perform(
            get("/calendar/events")
                .param("startDate", "2026-08-24")
                .param("endDate", "2026-08-24")
                .param("timeZone", "UTC"))
        .andExpect(status().isUnauthorized());
  }

  private UUID createUser(String prefix) {
    return userRepository
        .save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of(prefix + UUID.randomUUID() + "@example.test"),
                    "Calendar Tester",
                    Instant.now())
                .verify(Instant.now()))
        .id();
  }

  private Project saveProject(UUID ownerId, String name) {
    Instant now = Instant.parse("2026-08-20T00:00:00Z");
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
            now,
            now,
            Set.of(),
            0L));
  }

  private Milestone saveMilestone(UUID projectId, String title, LocalDate date) {
    Instant now = Instant.parse("2026-08-20T00:00:00Z");
    return milestoneRepository.save(
        new Milestone(
            UUID.randomUUID(),
            projectId,
            title,
            Optional.of(date),
            MilestoneStatus.PLANNED,
            0,
            now,
            now,
            0L));
  }

  private Task saveTask(UUID ownerId, UUID projectId, String title, String dueAt) {
    Instant now = Instant.parse("2026-08-20T00:00:00Z");
    return taskRepository.save(
        new Task(
            UUID.randomUUID(),
            ownerId,
            Optional.ofNullable(projectId),
            title,
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P2,
            Optional.of(Instant.parse(dueAt)),
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
            Set.of(),
            0L));
  }

  private TimeBlock saveBlock(
      UUID ownerId, UUID projectId, UUID taskId, String title, String startAt) {
    Instant start = Instant.parse(startAt);
    return timeBlockRepository.save(
        new TimeBlock(
            UUID.randomUUID(),
            ownerId,
            Optional.ofNullable(projectId),
            Optional.ofNullable(taskId),
            title,
            "FOCUS",
            TimeBlockStatus.SCHEDULED,
            start,
            start.plusSeconds(3600),
            "UTC",
            Optional.empty(),
            Instant.parse("2026-08-20T00:00:00Z"),
            Instant.parse("2026-08-20T00:00:00Z"),
            0L));
  }
}
