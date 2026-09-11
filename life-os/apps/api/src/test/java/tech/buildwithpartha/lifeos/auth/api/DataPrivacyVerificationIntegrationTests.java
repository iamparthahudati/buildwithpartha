package tech.buildwithpartha.lifeos.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentEntityType;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentRepository;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentStatus;
import tech.buildwithpartha.lifeos.audit.domain.ProductActivityEvent;
import tech.buildwithpartha.lifeos.audit.domain.ProductActivityRepository;
import tech.buildwithpartha.lifeos.auth.application.AccountDeletionPurgeService;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionGracePeriod;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionGracePeriodRepository;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionRequestStatus;
import tech.buildwithpartha.lifeos.auth.domain.AccountStatus;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.PasswordHasher;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptance;
import tech.buildwithpartha.lifeos.auth.domain.TermsAcceptanceRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItem;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemRepository;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemStatus;
import tech.buildwithpartha.lifeos.comment.domain.Comment;
import tech.buildwithpartha.lifeos.comment.domain.CommentFormat;
import tech.buildwithpartha.lifeos.comment.domain.CommentRepository;
import tech.buildwithpartha.lifeos.common.activity.ActivityEventType;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;
import tech.buildwithpartha.lifeos.export.application.ExportArchiveBuilder;
import tech.buildwithpartha.lifeos.focus.domain.FocusSession;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionInterruption;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionInterruptionRepository;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionRepository;
import tech.buildwithpartha.lifeos.goal.domain.CheckInCadence;
import tech.buildwithpartha.lifeos.goal.domain.Goal;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckIn;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckInRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalLink;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkTargetType;
import tech.buildwithpartha.lifeos.goal.domain.GoalProgressType;
import tech.buildwithpartha.lifeos.goal.domain.GoalRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;
import tech.buildwithpartha.lifeos.habit.domain.Habit;
import tech.buildwithpartha.lifeos.habit.domain.HabitCadence;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntry;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntryRepository;
import tech.buildwithpartha.lifeos.habit.domain.HabitRepository;
import tech.buildwithpartha.lifeos.label.domain.Label;
import tech.buildwithpartha.lifeos.label.domain.LabelRepository;
import tech.buildwithpartha.lifeos.note.domain.Note;
import tech.buildwithpartha.lifeos.note.domain.NoteLink;
import tech.buildwithpartha.lifeos.note.domain.NoteLinkTargetType;
import tech.buildwithpartha.lifeos.note.domain.NoteRepository;
import tech.buildwithpartha.lifeos.notification.domain.Notification;
import tech.buildwithpartha.lifeos.notification.domain.NotificationCategory;
import tech.buildwithpartha.lifeos.notification.domain.NotificationRepository;
import tech.buildwithpartha.lifeos.project.domain.Milestone;
import tech.buildwithpartha.lifeos.project.domain.MilestoneRepository;
import tech.buildwithpartha.lifeos.project.domain.MilestoneStatus;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;
import tech.buildwithpartha.lifeos.sprint.domain.Review;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewAnswer;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewItemDecision;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewRepository;
import tech.buildwithpartha.lifeos.sprint.domain.ReviewType;
import tech.buildwithpartha.lifeos.sprint.domain.Sprint;
import tech.buildwithpartha.lifeos.sprint.domain.SprintRepository;
import tech.buildwithpartha.lifeos.sprint.domain.SprintStatus;
import tech.buildwithpartha.lifeos.sprint.domain.SprintTask;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlan;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanCapacity;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanItem;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanOutcome;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanRepository;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanStatus;
import tech.buildwithpartha.lifeos.task.domain.Subtask;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;
import tech.buildwithpartha.lifeos.user.domain.UserPreferences;
import tech.buildwithpartha.lifeos.user.domain.UserPreferencesRepository;

/**
 * Verification Integration Test Suite for Data Export, Deletion Lifecycle, and Privacy (LOS-1512).
 *
 * <p>Validates:
 *
 * <ul>
 *   <li>1. Export archive completeness across all 19 domain models and manifest schema validity.
 *   <li>2. Strict exclusion of authentication secrets, password hashes, and tokens in exports.
 *   <li>3. Cross-user tenant isolation in export archives.
 *   <li>4. Account deletion grace period lifecycle, immediate session revocation, and cancellation
 *       restoration.
 *   <li>5. Cascade purge of all user records upon grace period expiry while retaining minimal
 *       deletion ledger.
 * </ul>
 */
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Data Export, Deletion Lifecycle & Privacy Verification Suite (LOS-1512)")
class DataPrivacyVerificationIntegrationTests {

  private static final String SESSION_COOKIE_NAME = "lifeos_session";
  private static final String CSRF_HEADER_NAME = "X-CSRF-TOKEN";

  @Autowired private MockMvc mockMvc;
  @Autowired private ExportArchiveBuilder exportArchiveBuilder;
  @Autowired private UserRepository userRepository;
  @Autowired private CredentialRepository credentialRepository;
  @Autowired private SessionRepository sessionRepository;
  @Autowired private TermsAcceptanceRepository termsAcceptanceRepository;
  @Autowired private UserPreferencesRepository userPreferencesRepository;
  @Autowired private TaskRepository taskRepository;
  @Autowired private ProjectRepository projectRepository;
  @Autowired private MilestoneRepository milestoneRepository;
  @Autowired private LabelRepository labelRepository;
  @Autowired private TimeBlockRepository timeBlockRepository;
  @Autowired private FocusSessionRepository focusSessionRepository;
  @Autowired private FocusSessionInterruptionRepository interruptionRepository;
  @Autowired private SprintRepository sprintRepository;
  @Autowired private WeeklyPlanRepository weeklyPlanRepository;
  @Autowired private ReviewRepository reviewRepository;
  @Autowired private GoalRepository goalRepository;
  @Autowired private GoalCheckInRepository goalCheckInRepository;
  @Autowired private GoalLinkRepository goalLinkRepository;
  @Autowired private NoteRepository noteRepository;
  @Autowired private BrainDumpItemRepository brainDumpItemRepository;
  @Autowired private HabitRepository habitRepository;
  @Autowired private HabitEntryRepository habitEntryRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private ProductActivityRepository productActivityRepository;
  @Autowired private CommentRepository commentRepository;
  @Autowired private AttachmentRepository attachmentRepository;
  @Autowired private AccountDeletionGracePeriodRepository gracePeriodRepository;
  @Autowired private AccountDeletionPurgeService purgeService;
  @Autowired private TransactionTemplate transactionTemplate;
  @Autowired private SecureTokenGenerator tokenGenerator;
  @Autowired private PasswordHasher passwordHasher;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  private UUID userAId;
  private Cookie sessionCookieA;
  private RawToken csrfTokenA;
  private String userAPassword = "ValidPassword!2026";

  private UUID userBId;
  private Cookie sessionCookieB;
  private RawToken csrfTokenB;

  @BeforeEach
  void setUp() {
    Instant now = Instant.now();

    // User A setup
    userAId = UUID.randomUUID();
    User userA =
        User.signup(
                userAId,
                EmailAddress.of("privacy-user-a-" + userAId + "@example.test"),
                "Privacy User A",
                now)
            .verify(now);
    userRepository.save(userA);
    credentialRepository.save(
        Credential.issue(
            UUID.randomUUID(), userAId, passwordHasher.hash(RawPassword.of(userAPassword)), now));

    RawToken tokenA = tokenGenerator.generate();
    csrfTokenA = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(), userAId, tokenA.hash(), csrfTokenA.hash(), now, Optional.empty()));
    sessionCookieA = new Cookie(SESSION_COOKIE_NAME, tokenA.value());
    sessionCookieA.setPath("/");
    sessionCookieA.setHttpOnly(true);

    // User B setup
    userBId = UUID.randomUUID();
    User userB =
        User.signup(
                userBId,
                EmailAddress.of("privacy-user-b-" + userBId + "@example.test"),
                "Privacy User B",
                now)
            .verify(now);
    userRepository.save(userB);
    credentialRepository.save(
        Credential.issue(
            UUID.randomUUID(),
            userBId,
            passwordHasher.hash(RawPassword.of("OtherPassword!2026")),
            now));

    RawToken tokenB = tokenGenerator.generate();
    csrfTokenB = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(), userBId, tokenB.hash(), csrfTokenB.hash(), now, Optional.empty()));
    sessionCookieB = new Cookie(SESSION_COOKIE_NAME, tokenB.value());
    sessionCookieB.setPath("/");
    sessionCookieB.setHttpOnly(true);
  }

  // =========================================================================
  // 1. EXPORT ARCHIVE COMPLETENESS & SCHEMA COMPLIANCE
  // =========================================================================

  @Test
  @DisplayName(
      "PRIV-01: Export archive contains all 19 domain models and adheres to manifest schema")
  void testExportArchiveCompletenessAndSchema() throws Exception {
    Instant now = Instant.now();
    populateComprehensiveUserData(userAId, now);

    byte[] zipBytes = exportArchiveBuilder.buildArchive(userAId, now);
    assertThat(zipBytes).isNotEmpty();

    Map<String, String> zipContents = extractZip(zipBytes);

    // 1. Check README.md
    assertThat(zipContents).containsKey("README.md");
    assertThat(zipContents.get("README.md")).contains("LifeOS Personal Data Export");

    // 2. Check manifest.json and its required fields
    assertThat(zipContents).containsKey("manifest.json");
    JsonNode manifestNode = objectMapper.readTree(zipContents.get("manifest.json"));
    assertThat(manifestNode.get("exportVersion").asText()).isEqualTo("1.0.0");
    assertThat(manifestNode.get("accountId").asText()).isEqualTo(userAId.toString());
    assertThat(manifestNode.hasNonNull("generatedAt")).isTrue();
    assertThat(manifestNode.hasNonNull("timeZone")).isTrue();
    assertThat(manifestNode.hasNonNull("locale")).isTrue();
    assertThat(manifestNode.get("files").isArray()).isTrue();

    // 3. Verify presence of all expected domain export JSON files
    List<String> expectedFiles =
        List.of(
            "account.json",
            "terms.json",
            "preferences.json",
            "tasks.json",
            "projects.json",
            "labels.json",
            "timeblocks.json",
            "focus_sessions.json",
            "sprints.json",
            "weekly_plans.json",
            "reviews.json",
            "goals.json",
            "notes.json",
            "braindump.json",
            "habits.json",
            "notifications.json",
            "activity.json",
            "comments.json",
            "attachments.json");

    for (String file : expectedFiles) {
      assertThat(zipContents).as("ZIP must contain " + file).containsKey(file);
      JsonNode node = objectMapper.readTree(zipContents.get(file));
      assertThat(node).isNotNull();
    }

    // 4. Verify specific entity values inside exported files
    JsonNode tasksNode = objectMapper.readTree(zipContents.get("tasks.json"));
    assertThat(tasksNode.isArray()).isTrue();
    assertThat(tasksNode.size()).isGreaterThanOrEqualTo(1);
    assertThat(tasksNode.get(0).get("title").asText()).isEqualTo("Test Privacy Task");

    JsonNode projectsNode = objectMapper.readTree(zipContents.get("projects.json"));
    assertThat(projectsNode.size()).isGreaterThanOrEqualTo(1);
    assertThat(projectsNode.get(0).get("name").asText()).isEqualTo("Test Privacy Project");

    JsonNode notesNode = objectMapper.readTree(zipContents.get("notes.json"));
    assertThat(notesNode.size()).isGreaterThanOrEqualTo(1);
    assertThat(notesNode.get(0).get("title").asText()).isEqualTo("Test Privacy Note");
    assertThat(notesNode.get(0).get("body").asText()).isEqualTo("Private Note Body Content");
  }

  // =========================================================================
  // 2. EXCLUSION OF SECRETS & CREDENTIALS
  // =========================================================================

  @Test
  @DisplayName(
      "PRIV-02: Export archive strictly excludes passwords, tokens, hashes, and security secrets")
  void testExportExcludesSecrets() throws Exception {
    Instant now = Instant.now();
    populateComprehensiveUserData(userAId, now);

    byte[] zipBytes = exportArchiveBuilder.buildArchive(userAId, now);
    Map<String, String> zipContents = extractZip(zipBytes);

    for (Map.Entry<String, String> entry : zipContents.entrySet()) {
      String content = entry.getValue();
      assertThat(content).doesNotContain("$argon2");
      assertThat(content).doesNotContain("passwordHash");
      assertThat(content).doesNotContain("tokenHash");
      assertThat(content).doesNotContain("csrfToken");
      assertThat(content).doesNotContain("sessionSecret");
    }

    JsonNode accountNode = objectMapper.readTree(zipContents.get("account.json"));
    assertThat(accountNode.has("password")).isFalse();
    assertThat(accountNode.has("passwordHash")).isFalse();
    assertThat(accountNode.has("credential")).isFalse();
  }

  // =========================================================================
  // 3. CROSS-USER TENANT ISOLATION
  // =========================================================================

  @Test
  @DisplayName(
      "PRIV-03: Export archive isolates tenant data and contains zero foreign account records")
  void testCrossUserExportIsolation() throws Exception {
    Instant now = Instant.now();
    populateComprehensiveUserData(userAId, now);

    // Create User B private task and note
    Task taskB =
        new Task(
            UUID.randomUUID(),
            userBId,
            Optional.empty(),
            "User B Secret Task",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P1,
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
            0L);
    taskRepository.save(taskB);

    Note noteB =
        new Note(
            UUID.randomUUID(),
            userBId,
            "User B Secret Note",
            "Confidential User B Notes",
            false,
            false,
            now,
            now,
            Set.of(),
            List.of(),
            0L);
    noteRepository.save(noteB);

    byte[] zipBytesA = exportArchiveBuilder.buildArchive(userAId, now);
    Map<String, String> zipContentsA = extractZip(zipBytesA);

    assertThat(zipContentsA.get("tasks.json")).doesNotContain("User B Secret Task");
    assertThat(zipContentsA.get("notes.json")).doesNotContain("User B Secret Note");
    assertThat(zipContentsA.get("notes.json")).doesNotContain("Confidential User B Notes");
  }

  // =========================================================================
  // 4. ACCOUNT DELETION GRACE PERIOD & SESSION REVOCATION
  // =========================================================================

  @Test
  @DisplayName(
      "PRIV-04: Account deletion enters 30-day grace period, revokes active sessions immediately")
  void testAccountDeletionGracePeriodAndSessionRevocation() throws Exception {
    // 1. User A initiates deletion request
    mockMvc
        .perform(
            post("/auth/account/delete")
                .cookie(sessionCookieA)
                .header(CSRF_HEADER_NAME, csrfTokenA.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"currentPassword\":\""
                        + userAPassword
                        + "\",\"confirmationText\":\"Privacy User A\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("GRACE_PERIOD"))
        .andExpect(jsonPath("$.scheduledPurgeAt").exists());

    // 2. User account status is now PENDING_DELETION
    User updatedUser = userRepository.findById(userAId).orElseThrow();
    assertThat(updatedUser.accountStatus()).isEqualTo(AccountStatus.PENDING_DELETION);

    // 3. All active sessions for User A are revoked immediately -> 401 Unauthorized
    mockMvc
        .perform(get("/user/profile").cookie(sessionCookieA))
        .andExpect(status().isUnauthorized());
  }

  // =========================================================================
  // 5. ACCOUNT DELETION CANCELLATION & RESTORE
  // =========================================================================

  @Test
  @DisplayName("PRIV-05: Account deletion cancellation restores account to ACTIVE status")
  void testCancelAccountDeletion() throws Exception {
    Instant now = Instant.now();
    RawToken cancelToken = tokenGenerator.generate();
    gracePeriodRepository.save(
        AccountDeletionGracePeriod.request(UUID.randomUUID(), userAId, cancelToken.hash(), now));

    User user = userRepository.findById(userAId).orElseThrow();
    userRepository.save(user.requestDeletion(now));

    // Cancel deletion request
    mockMvc
        .perform(
            post("/auth/cancel-deletion")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + cancelToken.value() + "\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CANCELLED"));

    // Verify account is restored to ACTIVE
    User restoredUser = userRepository.findById(userAId).orElseThrow();
    assertThat(restoredUser.accountStatus()).isEqualTo(AccountStatus.ACTIVE);
  }

  // =========================================================================
  // 6. CASCADE PURGE & MINIMAL AUDIT RETENTION
  // =========================================================================

  @Test
  @DisplayName(
      "PRIV-06: Expired grace period purges all user data cascadingly while preserving minimal"
          + " ledger")
  void testCascadePurgeAfterGracePeriod() {
    Instant now = Instant.now();
    populateComprehensiveUserData(userAId, now);

    RawToken cancelToken = tokenGenerator.generate();
    transactionTemplate.executeWithoutResult(
        txStatus -> {
          AccountDeletionGracePeriod gracePeriod =
              new AccountDeletionGracePeriod(
                  UUID.randomUUID(),
                  userAId,
                  AccountDeletionRequestStatus.GRACE_PERIOD,
                  cancelToken.hash(),
                  now.minus(Duration.ofDays(31)),
                  now.minus(Duration.ofDays(1)),
                  Optional.empty(),
                  Optional.empty(),
                  now.minus(Duration.ofDays(31)));
          gracePeriodRepository.save(gracePeriod);

          User user = userRepository.findById(userAId).orElseThrow();
          userRepository.save(user.requestDeletion(now.minus(Duration.ofDays(31))));
        });

    // Run purge service
    int purgedCount = purgeService.purgeDueAccounts();
    assertThat(purgedCount).isGreaterThanOrEqualTo(1);

    // 1. User row is deleted
    assertThat(userRepository.findById(userAId)).isEmpty();

    // 2. Minimal non-PII deletion ledger record is retained with PURGED status per R6/R8 retention
    AccountDeletionGracePeriod purgedRecord =
        gracePeriodRepository.findByTokenHash(cancelToken.hash()).orElseThrow();
    assertThat(purgedRecord.status()).isEqualTo(AccountDeletionRequestStatus.PURGED);
    assertThat(purgedRecord.purgedAt()).isPresent();
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  private void populateComprehensiveUserData(UUID userId, Instant now) {
    transactionTemplate.executeWithoutResult(
        txStatus -> {
          termsAcceptanceRepository.save(
              TermsAcceptance.termsAccepted(
                  UUID.randomUUID(), userId, "1.0.0", now, Optional.empty()));
          termsAcceptanceRepository.save(
              TermsAcceptance.privacyAcknowledged(
                  UUID.randomUUID(), userId, "1.0.0", now, Optional.empty()));
          userPreferencesRepository.save(UserPreferences.createDefault(userId, now));

          Label label =
              new Label(UUID.randomUUID(), userId, "Urgent", "urgent", "#ff0000", now, now, 0L);
          labelRepository.save(label);

          Project project =
              new Project(
                  UUID.randomUUID(),
                  userId,
                  "Test Privacy Project",
                  Optional.of("Project Description"),
                  ProjectStatus.ACTIVE,
                  ProjectPriority.P1,
                  ProjectHealth.ON_TRACK,
                  Optional.of("#0000ff"),
                  Optional.empty(),
                  Optional.empty(),
                  Optional.of(LocalDate.now()),
                  Optional.of(LocalDate.now().plusDays(30)),
                  Optional.of(120),
                  Optional.empty(),
                  now,
                  now,
                  Set.of(label.id()),
                  0L);
          projectRepository.save(project);

          Milestone milestone =
              new Milestone(
                  UUID.randomUUID(),
                  project.id(),
                  "Milestone 1",
                  Optional.of(LocalDate.now().plusDays(15)),
                  MilestoneStatus.PLANNED,
                  1,
                  now,
                  now,
                  0L);
          milestoneRepository.save(milestone);

          Subtask subtask =
              new Subtask(
                  UUID.randomUUID(), UUID.randomUUID(), "Subtask 1", false, 0, now, now, 0L);
          Task task =
              new Task(
                  subtask.taskId(),
                  userId,
                  Optional.of(project.id()),
                  "Test Privacy Task",
                  Optional.of("Task Description"),
                  TaskStatus.IN_PROGRESS,
                  TaskPriority.P1,
                  Optional.of(now.plusSeconds(3600)),
                  60,
                  15,
                  25,
                  Optional.of(LocalDate.now()),
                  0,
                  Optional.empty(),
                  Optional.empty(),
                  now,
                  now,
                  List.of(subtask),
                  Set.of(label.id()),
                  0L);
          taskRepository.save(task);

          TimeBlock timeBlock =
              new TimeBlock(
                  UUID.randomUUID(),
                  userId,
                  Optional.of(project.id()),
                  Optional.of(task.id()),
                  "Deep Work",
                  "WORK",
                  TimeBlockStatus.IN_PROGRESS,
                  now,
                  now.plusSeconds(3600),
                  "UTC",
                  Optional.of("Focus block notes"),
                  now,
                  now,
                  0L);
          timeBlockRepository.save(timeBlock);

          FocusSession focusSession =
              FocusSession.start(
                  UUID.randomUUID(),
                  userId,
                  Optional.of(task.id()),
                  Optional.of(timeBlock.id()),
                  Duration.ofMinutes(25),
                  Duration.ofMinutes(5),
                  now);
          focusSessionRepository.save(focusSession);

          FocusSessionInterruption interruption =
              focusSession.recordInterruption(UUID.randomUUID(), now, "Doorbell rang");
          interruptionRepository.save(interruption);

          SprintTask sprintTask =
              new SprintTask(
                  UUID.randomUUID(),
                  task.id(),
                  3,
                  0,
                  false,
                  now,
                  Optional.empty(),
                  Optional.empty());
          Sprint sprint =
              new Sprint(
                  UUID.randomUUID(),
                  userId,
                  "Sprint 1",
                  Optional.of("Ship privacy features"),
                  LocalDate.now(),
                  LocalDate.now().plusDays(14),
                  SprintStatus.ACTIVE,
                  30,
                  Optional.of("Retro notes"),
                  Optional.of("Good velocity"),
                  Optional.of("Better estimates"),
                  List.of("Action 1"),
                  1,
                  0,
                  0,
                  0,
                  0,
                  3,
                  0,
                  Optional.empty(),
                  now,
                  now,
                  List.of(sprintTask),
                  List.of(),
                  0L);
          sprintRepository.save(sprint);

          WeeklyPlanOutcome outcome = new WeeklyPlanOutcome(UUID.randomUUID(), "Outcome 1", 0);
          WeeklyPlanItem planItem =
              new WeeklyPlanItem(
                  UUID.randomUUID(),
                  task.id(),
                  Optional.of(outcome.id()),
                  Optional.of(LocalDate.now()),
                  60,
                  0,
                  task.title(),
                  task.status().name());
          WeeklyPlanCapacity capacity = new WeeklyPlanCapacity(LocalDate.now(), 480);
          WeeklyPlan weeklyPlan =
              new WeeklyPlan(
                  UUID.randomUUID(),
                  userId,
                  LocalDate.now(),
                  LocalDate.now().plusDays(6),
                  "UTC",
                  1,
                  1,
                  WeeklyPlanStatus.DRAFT,
                  Optional.empty(),
                  Optional.empty(),
                  Optional.empty(),
                  List.of(capacity),
                  List.of(outcome),
                  List.of(planItem),
                  now,
                  now,
                  0L);
          weeklyPlanRepository.save(weeklyPlan);

          ReviewAnswer reviewAnswer =
              new ReviewAnswer(UUID.randomUUID(), "prompt_1", "Great progress");
          ReviewItemDecision reviewDecision =
              new ReviewItemDecision(
                  UUID.randomUUID(),
                  "TASK",
                  task.id(),
                  "KEEP",
                  Optional.of(LocalDate.now().plusDays(1)),
                  Optional.of("Keep going"));
          Review review =
              Review.createDraft(
                  UUID.randomUUID(),
                  userId,
                  ReviewType.DAILY_MORNING,
                  "2026-09-12",
                  LocalDate.now(),
                  LocalDate.now(),
                  "UTC",
                  List.of(reviewAnswer),
                  List.of(reviewDecision),
                  now);
          reviewRepository.save(review);

          Goal goal =
              new Goal(
                  UUID.randomUUID(),
                  userId,
                  "Launch LifeOS",
                  Optional.of("Launch productivity app"),
                  "CAREER",
                  GoalProgressType.PERCENTAGE,
                  Optional.of(BigDecimal.valueOf(100)),
                  BigDecimal.valueOf(50),
                  Optional.of("%"),
                  Optional.of(LocalDate.now().plusDays(60)),
                  GoalStatus.ACTIVE,
                  CheckInCadence.WEEKLY,
                  false,
                  now,
                  now,
                  0L);
          goalRepository.save(goal);

          GoalCheckIn checkIn =
              new GoalCheckIn(
                  UUID.randomUUID(),
                  goal.id(),
                  userId,
                  BigDecimal.valueOf(50),
                  Optional.of("Halfway milestone"),
                  now,
                  now);
          goalCheckInRepository.save(checkIn);

          GoalLink goalLink =
              new GoalLink(
                  UUID.randomUUID(),
                  goal.id(),
                  userId,
                  GoalLinkTargetType.PROJECT,
                  project.id(),
                  now);
          goalLinkRepository.save(goalLink);

          UUID noteId = UUID.randomUUID();
          NoteLink noteLink =
              new NoteLink(
                  UUID.randomUUID(), noteId, userId, NoteLinkTargetType.TASK, task.id(), now);
          Note note =
              new Note(
                  noteId,
                  userId,
                  "Test Privacy Note",
                  "Private Note Body Content",
                  true,
                  false,
                  now,
                  now,
                  Set.of(label.id()),
                  List.of(noteLink),
                  0L);
          noteRepository.save(note);

          BrainDumpItem brainDumpItem =
              new BrainDumpItem(
                  UUID.randomUUID(),
                  userId,
                  "Remember to buy groceries",
                  BrainDumpItemStatus.UNPROCESSED,
                  Optional.empty(),
                  Optional.empty(),
                  Optional.empty(),
                  Optional.empty(),
                  now,
                  now,
                  0L);
          brainDumpItemRepository.save(brainDumpItem);

          Habit habit =
              new Habit(
                  UUID.randomUUID(),
                  userId,
                  "Daily Exercise",
                  Optional.of("30 mins workout"),
                  HabitCadence.DAILY,
                  1,
                  "UTC",
                  Optional.of("#00ff00"),
                  true,
                  Optional.of(LocalTime.of(8, 0)),
                  false,
                  now,
                  now,
                  0L);
          habitRepository.save(habit);

          HabitEntry habitEntry =
              new HabitEntry(
                  UUID.randomUUID(), habit.id(), userId, LocalDate.now(), 1, now, now, 0L);
          habitEntryRepository.save(habitEntry);

          Notification notification =
              Notification.create(
                  userId,
                  NotificationCategory.SYSTEM,
                  "Welcome to LifeOS",
                  "Your workspace is ready",
                  "/dashboard",
                  true,
                  now);
          notificationRepository.save(notification);

          ProductActivityEvent activityEvent =
              new ProductActivityEvent(
                  UUID.randomUUID(),
                  userId,
                  userId,
                  ActivityEventType.TASK_CREATED,
                  ActivitySubjectType.TASK,
                  task.id(),
                  "corr-privacy-123",
                  now);
          productActivityRepository.save(activityEvent);

          Comment comment =
              Comment.create(
                  UUID.randomUUID(),
                  userId,
                  CommentParentType.TASK,
                  task.id(),
                  "Great work on this task",
                  CommentFormat.PLAIN_TEXT,
                  now);
          commentRepository.save(comment);

          Attachment attachment =
              new Attachment(
                  UUID.randomUUID(),
                  userId,
                  AttachmentEntityType.TASK,
                  task.id(),
                  "doc.pdf",
                  "doc.pdf",
                  "application/pdf",
                  1024,
                  "storage-key-123",
                  AttachmentStatus.CLEAN,
                  "CLEAN",
                  now,
                  now,
                  null);
          attachmentRepository.save(attachment);
        });
  }

  private Map<String, String> extractZip(byte[] zipBytes) throws Exception {
    Map<String, String> contents = new HashMap<>();
    try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
      ZipEntry entry;
      while ((entry = zip.getNextEntry()) != null) {
        byte[] bytes = zip.readAllBytes();
        contents.put(entry.getName(), new String(bytes, java.nio.charset.StandardCharsets.UTF_8));
      }
    }
    return contents;
  }
}
