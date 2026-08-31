package tech.buildwithpartha.lifeos.notification.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.notification.application.NotificationService;
import tech.buildwithpartha.lifeos.notification.domain.Notification;
import tech.buildwithpartha.lifeos.notification.domain.NotificationCategory;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("NotificationController integration tests")
class NotificationControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final NotificationService notificationService;

  private UUID userAId;
  private Cookie cookieA;
  private RawToken csrfA;
  private UUID userBId;
  private Cookie cookieB;
  private RawToken csrfB;

  @Autowired
  NotificationControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator,
      NotificationService notificationService) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
    this.notificationService = notificationService;
  }

  @BeforeEach
  void setUp() {
    userAId = createUser("notif-user-a");
    csrfA = tokenGenerator.generate();
    cookieA = createSessionCookie(userAId, csrfA);

    userBId = createUser("notif-user-b");
    csrfB = tokenGenerator.generate();
    cookieB = createSessionCookie(userBId, csrfB);
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

  private Cookie createSessionCookie(UUID userId, RawToken csrf) {
    RawToken token = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(), userId, token.hash(), csrf.hash(), Instant.now(), Optional.empty()));
    return new Cookie("lifeos_session", token.value());
  }

  @Test
  @DisplayName("Rejects unauthenticated notification request with 401")
  void rejectsUnauthenticatedRequest() throws Exception {
    mockMvc.perform(get("/notifications")).andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("Lists user notifications with filtering and owner isolation")
  void listsNotificationsWithFiltering() throws Exception {
    Notification n1 =
        notificationService.createNotification(
            userAId,
            NotificationCategory.DUE_REMINDER,
            "Task Due",
            "Task is due",
            "/app/tasks/1",
            true);
    Notification n2 =
        notificationService.createNotification(
            userAId,
            NotificationCategory.FOCUS,
            "Focus Reminder",
            "Focus is starting",
            "/app/focus",
            true);

    // User B notification (must not be visible to User A)
    notificationService.createNotification(
        userBId, NotificationCategory.DUE_REMINDER, "User B Task", "User B Body", null, true);

    // List all
    mockMvc
        .perform(get("/notifications").cookie(cookieA))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(2))
        .andExpect(jsonPath("$.items[0].id").value(n2.id().toString()))
        .andExpect(jsonPath("$.items[1].id").value(n1.id().toString()));

    // Filter category FOCUS
    mockMvc
        .perform(get("/notifications").cookie(cookieA).param("category", "FOCUS"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(1))
        .andExpect(jsonPath("$.items[0].id").value(n2.id().toString()));

    // Filter categories list FOCUS,DUE_REMINDER
    mockMvc
        .perform(get("/notifications").cookie(cookieA).param("categories", "FOCUS,DUE_REMINDER"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(2));

    // Filter categories list with whitespace, blank, and invalid values
    mockMvc
        .perform(get("/notifications").cookie(cookieA).param("categories", " ,INVALID,FOCUS"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(1))
        .andExpect(jsonPath("$.items[0].id").value(n2.id().toString()));

    // Filter category invalid value
    mockMvc
        .perform(get("/notifications").cookie(cookieA).param("category", "INVALID"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(2));

    // Mark n1 read and test unreadOnly filter
    notificationService.markAsRead(n1.id(), userAId);
    mockMvc
        .perform(get("/notifications").cookie(cookieA).param("unreadOnly", "true"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(1))
        .andExpect(jsonPath("$.items[0].id").value(n2.id().toString()));

    // Test pagination
    mockMvc
        .perform(get("/notifications").cookie(cookieA).param("page", "0").param("size", "1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items.length()").value(1))
        .andExpect(jsonPath("$.totalItems").value(2));
  }

  @Test
  @DisplayName("Gets unread count and marks notification read/unread/read-all")
  void managesReadState() throws Exception {
    Notification n1 =
        notificationService.createNotification(
            userAId, NotificationCategory.DUE_REMINDER, "N1", "Body 1", null, true);
    Notification n2 =
        notificationService.createNotification(
            userAId, NotificationCategory.HABIT, "N2", "Body 2", null, true);

    mockMvc
        .perform(get("/notifications/unread-count").cookie(cookieA))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(2));

    // Mark N1 read
    mockMvc
        .perform(
            put("/notifications/" + n1.id() + "/read")
                .cookie(cookieA)
                .header("X-CSRF-TOKEN", csrfA.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.readAt").isNotEmpty());

    mockMvc
        .perform(get("/notifications/unread-count").cookie(cookieA))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(1));

    // Mark N1 unread
    mockMvc
        .perform(
            put("/notifications/" + n1.id() + "/unread")
                .cookie(cookieA)
                .header("X-CSRF-TOKEN", csrfA.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.readAt").isEmpty());

    // Mark all read
    mockMvc
        .perform(
            put("/notifications/read-all").cookie(cookieA).header("X-CSRF-TOKEN", csrfA.value()))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/notifications/unread-count").cookie(cookieA))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(0));
  }

  @Test
  @DisplayName("Clears clearable notification and rejects clearing non-clearable security notice")
  void handlesNotificationClearing() throws Exception {
    Notification nNormal =
        notificationService.createNotification(
            userAId, NotificationCategory.REVIEW, "Review Prompt", "Evening review", null, true);
    Notification nSec =
        notificationService.createNotification(
            userAId,
            NotificationCategory.SECURITY,
            "Security Notice",
            "Password changed",
            null,
            false);

    // Clear normal notification
    mockMvc
        .perform(
            delete("/notifications/" + nNormal.id())
                .cookie(cookieA)
                .header("X-CSRF-TOKEN", csrfA.value()))
        .andExpect(status().isNoContent());

    // Re-deleting or deleting missing/other user's notification returns 404
    mockMvc
        .perform(
            delete("/notifications/" + nNormal.id())
                .cookie(cookieA)
                .header("X-CSRF-TOKEN", csrfA.value()))
        .andExpect(status().isNotFound());

    // Clearing non-clearable security notice returns 400 NOTIFICATION_NOT_CLEARABLE
    mockMvc
        .perform(
            delete("/notifications/" + nSec.id())
                .cookie(cookieA)
                .header("X-CSRF-TOKEN", csrfA.value()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("NOTIFICATION_NOT_CLEARABLE"));

    // Clear all clearable
    mockMvc
        .perform(delete("/notifications").cookie(cookieA).header("X-CSRF-TOKEN", csrfA.value()))
        .andExpect(status().isNoContent());

    // Security notice remains present
    mockMvc
        .perform(get("/notifications").cookie(cookieA))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalItems").value(1))
        .andExpect(jsonPath("$.items[0].id").value(nSec.id().toString()));
  }

  @Test
  @DisplayName("Gets and updates notification preferences")
  void managesNotificationPreferences() throws Exception {
    mockMvc
        .perform(get("/notifications/preferences").cookie(cookieA))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.quietHoursEnabled").value(false))
        .andExpect(jsonPath("$.quietHoursStart").value("22:00"))
        .andExpect(jsonPath("$.quietHoursEnd").value("07:00"));

    String updateJson =
        """
        {
          "quietHoursEnabled": true,
          "quietHoursStart": "23:30",
          "quietHoursEnd": "06:30",
          "dueRemindersEnabled": true,
          "overdueRemindersEnabled": true,
          "timeBlockRemindersEnabled": false,
          "focusRemindersEnabled": true,
          "habitRemindersEnabled": true,
          "reviewPromptsEnabled": true,
          "securityNoticesEnabled": true,
          "systemNoticesEnabled": true,
          "inAppChannelEnabled": true,
          "emailChannelEnabled": true,
          "pushChannelEnabled": false
        }
        """;

    mockMvc
        .perform(
            put("/notifications/preferences")
                .cookie(cookieA)
                .header("X-CSRF-TOKEN", csrfA.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateJson))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.quietHoursEnabled").value(true))
        .andExpect(jsonPath("$.quietHoursStart").value("23:30"))
        .andExpect(jsonPath("$.quietHoursEnd").value("06:30"))
        .andExpect(jsonPath("$.timeBlockRemindersEnabled").value(false))
        .andExpect(jsonPath("$.emailChannelEnabled").value(true));

    // Invalid quiet hours format returns 400 VALIDATION_FAILED
    String invalidJson =
        """
        {
          "quietHoursEnabled": true,
          "quietHoursStart": "25:99",
          "quietHoursEnd": "06:30",
          "dueRemindersEnabled": true,
          "overdueRemindersEnabled": true,
          "timeBlockRemindersEnabled": true,
          "focusRemindersEnabled": true,
          "habitRemindersEnabled": true,
          "reviewPromptsEnabled": true,
          "securityNoticesEnabled": true,
          "systemNoticesEnabled": true,
          "inAppChannelEnabled": true,
          "emailChannelEnabled": false,
          "pushChannelEnabled": false
        }
        """;

    mockMvc
        .perform(
            put("/notifications/preferences")
                .cookie(cookieA)
                .header("X-CSRF-TOKEN", csrfA.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidJson))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
  }

  @Test
  @DisplayName("Verifies NotificationResponse toString redaction")
  void verifiesNotificationResponseRedaction() {
    Notification n =
        notificationService.createNotification(
            userAId,
            NotificationCategory.DUE_REMINDER,
            "Secret Title",
            "Secret Body",
            "/app/test",
            true);

    NotificationResponse response = NotificationResponse.fromDomain(n);
    assertThat(response.toString())
        .doesNotContain("Secret Title")
        .doesNotContain("Secret Body")
        .contains("REDACTED");
  }
}
