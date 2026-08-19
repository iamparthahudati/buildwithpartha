package tech.buildwithpartha.lifeos.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
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
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class SecurityControllerTests {

  private static final String CSRF_HEADER_NAME = "X-CSRF-TOKEN";

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final CredentialRepository credentialRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final PasswordHasher passwordHasher;

  private UUID userId;
  private RawToken sessionToken;
  private RawToken csrfToken;
  private Cookie sessionCookie;

  @Autowired
  SecurityControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      CredentialRepository credentialRepository,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator,
      PasswordHasher passwordHasher) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.credentialRepository = credentialRepository;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
    this.passwordHasher = passwordHasher;
  }

  @BeforeEach
  void setUp() {
    userId =
        userRepository
            .save(
                User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of("security-" + UUID.randomUUID() + "@example.test"),
                    "Security User",
                    Instant.now()))
            .id();

    credentialRepository.save(
        Credential.issue(
            UUID.randomUUID(),
            userId,
            passwordHasher.hash(RawPassword.of("OldValidPassword123!")),
            Instant.now()));

    sessionToken = tokenGenerator.generate();
    csrfToken = tokenGenerator.generate();
    sessionCookie = new Cookie("lifeos_session", sessionToken.value());

    sessionRepository.save(
        new Session(
            UUID.randomUUID(),
            userId,
            tokenGenerator.hash(sessionToken.value()),
            tokenGenerator.hash(csrfToken.value()),
            Instant.now(),
            Instant.now(),
            Instant.now().plusSeconds(3600),
            Optional.empty(),
            Optional.of("Mac Chrome")));
  }

  @Test
  void changePasswordSucceedsWithValidCredentials() throws Exception {
    String payload =
        """
        {
          "currentPassword": "OldValidPassword123!",
          "newPassword": "NewValidPassword456!"
        }
        """;

    mockMvc
        .perform(
            post("/auth/change-password")
                .cookie(sessionCookie)
                .header(CSRF_HEADER_NAME, csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PASSWORD_CHANGED"));

    Credential updated = credentialRepository.findByUserId(userId).orElseThrow();
    assertThat(
            passwordHasher.matches(RawPassword.of("NewValidPassword456!"), updated.passwordHash()))
        .isTrue();
  }

  @Test
  void changePasswordRejectsWrongCurrentPassword() throws Exception {
    String payload =
        """
        {
          "currentPassword": "IncorrectPassword123!",
          "newPassword": "NewValidPassword456!"
        }
        """;

    mockMvc
        .perform(
            post("/auth/change-password")
                .cookie(sessionCookie)
                .header(CSRF_HEADER_NAME, csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("currentPassword"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID_CURRENT_PASSWORD"));
  }

  @Test
  void listsActiveSessions() throws Exception {
    mockMvc
        .perform(get("/auth/sessions").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessions").isArray())
        .andExpect(jsonPath("$.sessions[0].isCurrent").value(true))
        .andExpect(jsonPath("$.sessions[0].deviceHint").value("Mac Chrome"));
  }

  @Test
  void revokesSpecificSession() throws Exception {
    UUID otherSessionId = UUID.randomUUID();
    sessionRepository.save(
        new Session(
            otherSessionId,
            userId,
            "other-token-hash",
            "other-csrf-hash",
            Instant.now(),
            Instant.now(),
            Instant.now().plusSeconds(3600),
            Optional.empty(),
            Optional.of("Mobile Device")));

    mockMvc
        .perform(
            delete("/auth/sessions/" + otherSessionId)
                .cookie(sessionCookie)
                .header(CSRF_HEADER_NAME, csrfToken.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revoked").value(true));

    assertThat(sessionRepository.findById(otherSessionId).orElseThrow().isActive(Instant.now()))
        .isFalse();
  }

  @Test
  void revokesAllOtherSessions() throws Exception {
    UUID otherSessionId = UUID.randomUUID();
    sessionRepository.save(
        new Session(
            otherSessionId,
            userId,
            "other-token-hash",
            "other-csrf-hash",
            Instant.now(),
            Instant.now(),
            Instant.now().plusSeconds(3600),
            Optional.empty(),
            Optional.of("Tablet")));

    mockMvc
        .perform(
            post("/auth/sessions/revoke-others")
                .cookie(sessionCookie)
                .header(CSRF_HEADER_NAME, csrfToken.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revokedCount").value(1));

    assertThat(sessionRepository.findById(otherSessionId).orElseThrow().isActive(Instant.now()))
        .isFalse();
  }

  @Test
  void rejectsUnauthenticatedRequests() throws Exception {
    mockMvc.perform(get("/auth/sessions")).andExpect(status().isUnauthorized());
  }

  @Test
  void deleteAccount_validCredentialsAndConfirmation_entersGracePeriodAndClearsCookie()
      throws Exception {
    String payload =
        """
        {
          "currentPassword": "OldValidPassword123!",
          "confirmationText": "Security User"
        }
        """;

    mockMvc
        .perform(
            post("/auth/account/delete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload)
                .cookie(sessionCookie)
                .header(CSRF_HEADER_NAME, csrfToken.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("GRACE_PERIOD"))
        .andExpect(jsonPath("$.scheduledPurgeAt").exists());

    // The account record survives the grace period, but is no longer authenticatable.
    assertThat(userRepository.findById(userId)).isPresent();
    assertThat(userRepository.findById(userId).orElseThrow().accountStatus())
        .isEqualTo(AccountStatus.PENDING_DELETION);
    assertThat(sessionRepository.findActiveSessionsByUserId(userId, Instant.now())).isEmpty();

    // The revoked session cookie no longer authenticates any request.
    mockMvc
        .perform(get("/auth/sessions").cookie(sessionCookie))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void deleteAccount_invalidPassword_returnsBadRequest() throws Exception {
    String payload =
        """
        {
          "currentPassword": "WrongPassword123!",
          "confirmationText": "Security User"
        }
        """;

    mockMvc
        .perform(
            post("/auth/account/delete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload)
                .cookie(sessionCookie)
                .header(CSRF_HEADER_NAME, csrfToken.value()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("currentPassword"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID_CURRENT_PASSWORD"));
  }
}
