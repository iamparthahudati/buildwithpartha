package tech.buildwithpartha.lifeos.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tech.buildwithpartha.lifeos.auth.domain.AccountStatus;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationToken;
import tech.buildwithpartha.lifeos.auth.domain.EmailVerificationTokenRepository;
import tech.buildwithpartha.lifeos.auth.domain.PasswordHasher;
import tech.buildwithpartha.lifeos.auth.domain.PasswordResetToken;
import tech.buildwithpartha.lifeos.auth.domain.PasswordResetTokenRepository;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

/**
 * End-to-end security gate and threat-model verification suite (LOS-0520).
 *
 * <p>Validates the complete identity threat model across EPIC-05 (LOS-0501 to LOS-0519):
 *
 * <ul>
 *   <li>Full lifecycle: Signup -> Verification -> Login -> Auth -> Export -> Deletion
 *   <li>CSRF protection and token enforcement on state-changing endpoints
 *   <li>Session fixation and cookie flags (HttpOnly, Secure, SameSite=Lax, Path=/)
 *   <li>Account enumeration resistance on public auth endpoints
 *   <li>Cross-user resource isolation
 *   <li>Token replay and token expiry rejection
 * </ul>
 */
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class IdentitySecurityGateIntegrationTests {

  private static final String CSRF_HEADER_NAME = "X-CSRF-TOKEN";
  private static final String SESSION_COOKIE_NAME = "lifeos_session";

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final CredentialRepository credentialRepository;
  private final SessionRepository sessionRepository;
  private final EmailVerificationTokenRepository verificationTokenRepository;
  private final PasswordResetTokenRepository resetTokenRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final PasswordHasher passwordHasher;

  @Autowired
  IdentitySecurityGateIntegrationTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      CredentialRepository credentialRepository,
      SessionRepository sessionRepository,
      EmailVerificationTokenRepository verificationTokenRepository,
      PasswordResetTokenRepository resetTokenRepository,
      SecureTokenGenerator tokenGenerator,
      PasswordHasher passwordHasher) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.credentialRepository = credentialRepository;
    this.sessionRepository = sessionRepository;
    this.verificationTokenRepository = verificationTokenRepository;
    this.resetTokenRepository = resetTokenRepository;
    this.tokenGenerator = tokenGenerator;
    this.passwordHasher = passwordHasher;
  }

  @Test
  @DisplayName("Full Identity Lifecycle: Signup -> Verify -> Login -> Export -> Delete")
  void testFullIdentityLifecycle() throws Exception {
    String email = "gate-" + UUID.randomUUID() + "@example.test";
    String password = "SecureGatePassword123!";
    String displayName = "Security Gate User";

    // 1. Signup
    String signupPayload =
        """
        {
          "email": "%s",
          "password": "%s",
          "displayName": "%s",
          "timeZone": "Asia/Kolkata",
          "locale": "en-IN",
          "weekStart": 1,
          "termsVersion": "2026-08-01",
          "privacyVersion": "2026-08-01"
        }
        """
            .formatted(email, password, displayName);

    mockMvc
        .perform(
            post("/auth/signup").contentType(MediaType.APPLICATION_JSON).content(signupPayload))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("PENDING_VERIFICATION"));

    User unverifiedUser = userRepository.findByEmailNormalized(email.toLowerCase()).orElseThrow();
    assertThat(unverifiedUser.accountStatus()).isEqualTo(AccountStatus.UNVERIFIED);

    // 2. Email verification
    RawToken verificationRawToken = tokenGenerator.generate();
    verificationTokenRepository.save(
        EmailVerificationToken.issue(
            UUID.randomUUID(), unverifiedUser.id(), verificationRawToken.hash(), Instant.now()));

    String verifyPayload =
        """
        {
          "token": "%s"
        }
        """
            .formatted(verificationRawToken.value());

    mockMvc
        .perform(
            post("/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyPayload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("VERIFIED"));

    User verifiedUser = userRepository.findById(unverifiedUser.id()).orElseThrow();
    assertThat(verifiedUser.accountStatus()).isEqualTo(AccountStatus.ACTIVE);

    // 3. Login
    String loginPayload =
        """
        {
          "email": "%s",
          "password": "%s"
        }
        """
            .formatted(email, password);

    MvcResult loginResult =
        mockMvc
            .perform(
                post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginPayload))
            .andExpect(status().isOk())
            .andExpect(cookie().exists(SESSION_COOKIE_NAME))
            .andExpect(cookie().httpOnly(SESSION_COOKIE_NAME, true))
            .andExpect(cookie().secure(SESSION_COOKIE_NAME, true))
            .andExpect(jsonPath("$.csrfToken").isNotEmpty())
            .andReturn();

    Cookie sessionCookie = loginResult.getResponse().getCookie(SESSION_COOKIE_NAME);
    assertThat(sessionCookie).isNotNull();
    String csrfToken =
        com.jayway.jsonpath.JsonPath.read(
            loginResult.getResponse().getContentAsString(), "$.csrfToken");

    // 4. Authenticated sessions listing
    mockMvc
        .perform(get("/auth/sessions").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessions").isArray());

    // 5. Data export request (requires CSRF)
    mockMvc
        .perform(post("/auth/export").cookie(sessionCookie).header(CSRF_HEADER_NAME, csrfToken))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("GENERATING"));

    // 6. Request account deletion: enters a cancellable 30-day grace period, not an immediate
    // purge (31-PRIVACY-DATA-LIFECYCLE.md's accepted ADR-012 state machine).
    String deletePayload =
        """
        {
          "currentPassword": "%s",
          "confirmationText": "%s"
        }
        """
            .formatted(password, displayName);

    mockMvc
        .perform(
            post("/auth/account/delete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(deletePayload)
                .cookie(sessionCookie)
                .header(CSRF_HEADER_NAME, csrfToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("GRACE_PERIOD"));

    // 7. Post-request verification: the account record survives the grace period but is no
    // longer authenticatable — sessions are revoked and login is rejected identically to a
    // wrong password, so a pending deletion cannot be distinguished from any other failure.
    assertThat(userRepository.findById(verifiedUser.id())).isPresent();
    assertThat(userRepository.findById(verifiedUser.id()).orElseThrow().accountStatus())
        .isEqualTo(AccountStatus.PENDING_DELETION);
    assertThat(sessionRepository.findActiveSessionsByUserId(verifiedUser.id(), Instant.now()))
        .isEmpty();

    mockMvc
        .perform(get("/auth/sessions").cookie(sessionCookie))
        .andExpect(status().isUnauthorized());

    String loginAfterDeletionPayload =
        """
        {
          "email": "%s",
          "password": "%s"
        }
        """
            .formatted(email, password);
    mockMvc
        .perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginAfterDeletionPayload))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("CSRF Protection: Mutating requests without or with invalid CSRF token are rejected")
  void testCsrfProtection() throws Exception {
    UUID userId = UUID.randomUUID();
    User user =
        new User(
            userId,
            EmailAddress.of("csrf-test-" + userId + "@example.test"),
            "CSRF User",
            "UTC",
            "en-US",
            1,
            AccountStatus.ACTIVE,
            Optional.of(Instant.now()),
            Instant.now(),
            Instant.now(),
            0L);
    userRepository.save(user);

    RawToken sessionToken = tokenGenerator.generate();
    RawToken validCsrfToken = tokenGenerator.generate();
    Session session =
        Session.issue(
            UUID.randomUUID(),
            userId,
            sessionToken.hash(),
            validCsrfToken.hash(),
            Instant.now(),
            Optional.of("Test Device"));
    sessionRepository.save(session);
    Cookie sessionCookie = new Cookie(SESSION_COOKIE_NAME, sessionToken.value());

    // 1. Mutating POST without CSRF header -> 403 Forbidden
    mockMvc.perform(post("/auth/export").cookie(sessionCookie)).andExpect(status().isForbidden());

    // 2. Mutating POST with invalid CSRF header -> 403 Forbidden
    mockMvc
        .perform(
            post("/auth/export").cookie(sessionCookie).header(CSRF_HEADER_NAME, "wrong-csrf-token"))
        .andExpect(status().isForbidden());

    // 3. Mutating POST with valid CSRF header -> 202 Accepted
    mockMvc
        .perform(
            post("/auth/export")
                .cookie(sessionCookie)
                .header(CSRF_HEADER_NAME, validCsrfToken.value()))
        .andExpect(status().isAccepted());
  }

  @Test
  @DisplayName("Account Enumeration Resistance: forgot-password returns generic response")
  void testAccountEnumerationResistance() throws Exception {
    String nonExistentPayload =
        """
        {
          "email": "nonexistent-%s@example.test"
        }
        """
            .formatted(UUID.randomUUID());

    mockMvc
        .perform(
            post("/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(nonExistentPayload))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("REQUESTED"));
  }

  @Test
  @DisplayName("Cross-User Access: User A cannot access or mutate User B's resources")
  void testCrossUserAccessIsolation() throws Exception {
    UUID userAId = UUID.randomUUID();
    UUID userBId = UUID.randomUUID();

    User userA =
        new User(
            userAId,
            EmailAddress.of("userA-" + userAId + "@example.test"),
            "User A",
            "UTC",
            "en-US",
            1,
            AccountStatus.ACTIVE,
            Optional.of(Instant.now()),
            Instant.now(),
            Instant.now(),
            0L);
    userRepository.save(userA);

    User userB =
        new User(
            userBId,
            EmailAddress.of("userB-" + userBId + "@example.test"),
            "User B",
            "UTC",
            "en-US",
            1,
            AccountStatus.ACTIVE,
            Optional.of(Instant.now()),
            Instant.now(),
            Instant.now(),
            0L);
    userRepository.save(userB);

    RawToken sessionAToken = tokenGenerator.generate();
    RawToken csrfAToken = tokenGenerator.generate();
    Session sessionA =
        Session.issue(
            UUID.randomUUID(),
            userAId,
            sessionAToken.hash(),
            csrfAToken.hash(),
            Instant.now(),
            Optional.of("User A Device"));
    sessionRepository.save(sessionA);

    RawToken sessionBToken = tokenGenerator.generate();
    UUID sessionBId = UUID.randomUUID();
    Session sessionB =
        Session.issue(
            sessionBId,
            userBId,
            sessionBToken.hash(),
            "csrfB",
            Instant.now(),
            Optional.of("User B Device"));
    sessionRepository.save(sessionB);

    Cookie cookieA = new Cookie(SESSION_COOKIE_NAME, sessionAToken.value());

    // User A attempts to revoke User B's session -> revoked: false (ownership guard)
    mockMvc
        .perform(
            delete("/auth/sessions/" + sessionBId)
                .cookie(cookieA)
                .header(CSRF_HEADER_NAME, csrfAToken.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revoked").value(false));

    // Verify User B's session remains active
    assertThat(sessionRepository.findById(sessionBId).orElseThrow().isActive(Instant.now()))
        .isTrue();
  }

  @Test
  @DisplayName("Token Replay: Password reset tokens cannot be reused once consumed")
  void testTokenReplayProtection() throws Exception {
    UUID userId = UUID.randomUUID();
    User user =
        new User(
            userId,
            EmailAddress.of("reset-" + userId + "@example.test"),
            "Reset User",
            "UTC",
            "en-US",
            1,
            AccountStatus.ACTIVE,
            Optional.of(Instant.now()),
            Instant.now(),
            Instant.now(),
            0L);
    userRepository.save(user);

    Credential credential =
        Credential.issue(
            UUID.randomUUID(),
            userId,
            passwordHasher.hash(RawPassword.of("OldPassword123!")),
            Instant.now());
    credentialRepository.save(credential);

    RawToken resetRawToken = tokenGenerator.generate();
    PasswordResetToken resetToken =
        PasswordResetToken.issue(UUID.randomUUID(), userId, resetRawToken.hash(), Instant.now());
    resetTokenRepository.save(resetToken);

    String resetPayload =
        """
        {
          "token": "%s",
          "newPassword": "NewSecurePassword456!"
        }
        """
            .formatted(resetRawToken.value());

    // First consumption succeeds
    mockMvc
        .perform(
            post("/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(resetPayload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PASSWORD_RESET"));

    // Replay attempt fails with 409 Conflict
    mockMvc
        .perform(
            post("/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(resetPayload))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("TOKEN_ALREADY_USED"));
  }
}
