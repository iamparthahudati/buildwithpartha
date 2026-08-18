package tech.buildwithpartha.lifeos.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
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
 * Exercises {@code POST /auth/signup}, {@code POST /auth/verify-email}, {@code POST /auth/login},
 * {@code POST /auth/logout}[{@code -all}] and {@code POST /auth/forgot-password}/{@code
 * /reset-password} through the real filter chain (no {@code @WithMockUser}: the whole point of
 * every one of these endpoints is that it is reachable without a session) and the real {@code
 * SignupService}/{@code EmailVerificationService}/{@code LoginService}/{@code LogoutService}/
 * {@code ForgotPasswordService}/{@code ResetPasswordService}/JPA/Argon2/wordlist beans, matching
 * the full-context style {@code ApiProblemResponseTests} and {@code OpenApiArtifactTests} already
 * use. Whether the session cookie a successful login issues actually authenticates a later request
 * is {@code SessionAuthenticationFilterTests}' job, not this class's — everything here stays scoped
 * to each endpoint's own request/response contract.
 *
 * <p>Every test here that reaches {@code SignupService} spends one unit of {@code
 * InMemorySignupRateLimiter}'s budget for MockMvc's constant {@code 127.0.0.1} caller address; this
 * class deliberately keeps its total signup-triggering calls at 4, comfortably under the
 * 5-per-window limit, since the rate limiter bean is a test-class-scoped Spring singleton.
 * Verification and login are each rate limited by their own separate limiter bean, so the
 * verify-email and login tests below seed their own accounts (and, for verification, tokens)
 * directly through the real repository beans instead of going through signup.
 */
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTests {

  private static final String VALID_BODY =
      """
      {
        "email": "%s",
        "password": "a genuinely unusual passphrase 2026",
        "displayName": "New User",
        "termsVersion": "2026-08-01",
        "privacyVersion": "2026-08-01"
      }
      """;

  private static final String LOGIN_PASSWORD = "a genuinely unusual passphrase 2026";

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final CredentialRepository credentialRepository;
  private final EmailVerificationTokenRepository tokenRepository;
  private final SessionRepository sessionRepository;
  private final PasswordResetTokenRepository resetTokenRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final PasswordHasher passwordHasher;

  @Autowired
  AuthControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      CredentialRepository credentialRepository,
      EmailVerificationTokenRepository tokenRepository,
      SessionRepository sessionRepository,
      PasswordResetTokenRepository resetTokenRepository,
      SecureTokenGenerator tokenGenerator,
      PasswordHasher passwordHasher) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.credentialRepository = credentialRepository;
    this.tokenRepository = tokenRepository;
    this.sessionRepository = sessionRepository;
    this.resetTokenRepository = resetTokenRepository;
    this.tokenGenerator = tokenGenerator;
    this.passwordHasher = passwordHasher;
  }

  @Test
  void signupIsReachableWithoutAuthenticationAndReturnsTheGenericAcceptedResponse()
      throws Exception {
    mockMvc
        .perform(
            post("/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_BODY.formatted("controller-happy-path@example.test")))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("PENDING_VERIFICATION"));
  }

  @Test
  void rejectsAnInvalidEmailWithoutReachingTheRateLimiter() throws Exception {
    mockMvc
        .perform(
            post("/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_BODY.formatted("not-an-email")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[?(@.field == 'email')]").exists());
  }

  @Test
  void reportsAPasswordPolicyViolationAsASafeFieldProblem() throws Exception {
    String body =
        """
        {
          "email": "controller-weak-password@example.test",
          "password": "short",
          "displayName": "New User",
          "termsVersion": "2026-08-01",
          "privacyVersion": "2026-08-01"
        }
        """;

    mockMvc
        .perform(post("/auth/signup").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[?(@.field == 'password')]").exists())
        .andExpect(content().string(not(containsString("short"))));
  }

  @Test
  void aRepeatedSignupForTheSameEmailReturnsTheSameGenericResponse() throws Exception {
    String body = VALID_BODY.formatted("controller-duplicate@example.test");

    mockMvc
        .perform(post("/auth/signup").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("PENDING_VERIFICATION"));

    mockMvc
        .perform(post("/auth/signup").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("PENDING_VERIFICATION"));
  }

  @Test
  void verifyEmailIsReachableWithoutAuthenticationAndActivatesTheAccount() throws Exception {
    UUID userId = seedUnverifiedUser("controller-verify-happy-path@example.test");
    RawToken token = seedToken(userId, Instant.now());

    mockMvc
        .perform(
            post("/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\": \"" + token.value() + "\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("VERIFIED"));

    assertThat(userRepository.findById(userId).orElseThrow().accountStatus().name())
        .isEqualTo("ACTIVE");
  }

  @Test
  void rejectsAnUnknownTokenAsInvalid() throws Exception {
    mockMvc
        .perform(
            post("/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\": \"not-a-real-token\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("TOKEN_INVALID"));
  }

  @Test
  void rejectsAnAlreadyUsedTokenAsAConflict() throws Exception {
    UUID userId = seedUnverifiedUser("controller-verify-already-used@example.test");
    RawToken token = seedToken(userId, Instant.now());
    String body = "{\"token\": \"" + token.value() + "\"}";

    mockMvc
        .perform(post("/auth/verify-email").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isOk());

    mockMvc
        .perform(post("/auth/verify-email").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("TOKEN_ALREADY_USED"));
  }

  @Test
  void rejectsAnExpiredTokenWithoutActivatingTheAccount() throws Exception {
    UUID userId = seedUnverifiedUser("controller-verify-expired@example.test");
    RawToken token = seedToken(userId, Instant.now().minus(Duration.ofHours(25)));

    mockMvc
        .perform(
            post("/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\": \"" + token.value() + "\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("TOKEN_EXPIRED"));

    assertThat(userRepository.findById(userId).orElseThrow().accountStatus().name())
        .isEqualTo("UNVERIFIED");
  }

  @Test
  void loginIsReachableWithoutAuthenticationAndIssuesASessionCookieAndCsrfToken() throws Exception {
    seedActiveUser("controller-login-happy-path@example.test");

    MvcResult result =
        mockMvc
            .perform(
                post("/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginBody("controller-login-happy-path@example.test", LOGIN_PASSWORD)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("controller-login-happy-path@example.test"))
            .andExpect(jsonPath("$.csrfToken").isNotEmpty())
            .andExpect(header().exists("Set-Cookie"))
            .andReturn();

    String setCookie = result.getResponse().getHeader("Set-Cookie");
    assertThat(setCookie).contains("lifeos_session=");
    assertThat(setCookie).contains("HttpOnly");
    assertThat(setCookie).contains("Secure");
    assertThat(setCookie).contains("SameSite=Lax");
    assertThat(setCookie).contains("Path=/life-os");
    assertThat(result.getResponse().getContentAsString())
        .doesNotContain(extractCookieValue(setCookie));
  }

  @Test
  void rejectsAWrongPasswordWithTheGenericInvalidCredentialsFailureAndNoCookie() throws Exception {
    seedActiveUser("controller-login-wrong-password@example.test");

    mockMvc
        .perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody("controller-login-wrong-password@example.test", "not it")))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
        .andExpect(header().doesNotExist("Set-Cookie"));
  }

  @Test
  void rejectsAnUnknownEmailWithTheSameGenericFailureAsAWrongPassword() throws Exception {
    mockMvc
        .perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody("controller-login-unknown@example.test", LOGIN_PASSWORD)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
  }

  @Test
  void logoutIsReachableWithoutAuthenticationRevokesTheSessionAndClearsTheCookie()
      throws Exception {
    UUID userId = seedUnverifiedUser("controller-logout-happy-path@example.test");
    RawToken sessionToken = tokenGenerator.generate();
    RawToken csrfToken = tokenGenerator.generate();
    Session session = seedSession(userId, sessionToken, csrfToken);

    MvcResult result =
        mockMvc
            .perform(
                post("/auth/logout")
                    .cookie(new Cookie("lifeos_session", sessionToken.value()))
                    .header("X-CSRF-TOKEN", csrfToken.value()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("LOGGED_OUT"))
            .andExpect(header().exists("Set-Cookie"))
            .andReturn();

    String setCookie = result.getResponse().getHeader("Set-Cookie");
    assertThat(setCookie).contains("lifeos_session=");
    assertThat(setCookie).containsAnyOf("Max-Age=0", "Max-Age=0;");
    assertThat(sessionRepository.findByTokenHash(session.tokenHash()).orElseThrow().revokedAt())
        .isPresent();
  }

  @Test
  void logoutWithNoSessionCookieIsIdempotentAndStillClearsTheCookie() throws Exception {
    mockMvc
        .perform(post("/auth/logout"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("LOGGED_OUT"))
        .andExpect(header().exists("Set-Cookie"));
  }

  @Test
  void logoutRejectsAMismatchedCsrfTokenAndLeavesTheSessionActive() throws Exception {
    UUID userId = seedUnverifiedUser("controller-logout-bad-csrf@example.test");
    RawToken sessionToken = tokenGenerator.generate();
    RawToken csrfToken = tokenGenerator.generate();
    Session session = seedSession(userId, sessionToken, csrfToken);

    mockMvc
        .perform(
            post("/auth/logout")
                .cookie(new Cookie("lifeos_session", sessionToken.value()))
                .header("X-CSRF-TOKEN", "wrong-csrf-value"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("CSRF_TOKEN_INVALID"))
        .andExpect(header().doesNotExist("Set-Cookie"));

    assertThat(sessionRepository.findByTokenHash(session.tokenHash()).orElseThrow().revokedAt())
        .isEmpty();
  }

  @Test
  void logoutAllRevokesEverySessionForTheAccount() throws Exception {
    UUID userId = seedUnverifiedUser("controller-logout-all@example.test");
    RawToken sessionToken = tokenGenerator.generate();
    RawToken csrfToken = tokenGenerator.generate();
    Session firstSession = seedSession(userId, sessionToken, csrfToken);
    Session secondSession =
        seedSession(userId, RawToken.of("second-value", "sha256:second-hash"), csrfToken);

    mockMvc
        .perform(
            post("/auth/logout-all")
                .cookie(new Cookie("lifeos_session", sessionToken.value()))
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("LOGGED_OUT"));

    assertThat(
            sessionRepository.findByTokenHash(firstSession.tokenHash()).orElseThrow().revokedAt())
        .isPresent();
    assertThat(
            sessionRepository.findByTokenHash(secondSession.tokenHash()).orElseThrow().revokedAt())
        .isPresent();
  }

  @Test
  void forgotPasswordIsReachableWithoutAuthenticationAndReturnsTheGenericAcceptedResponse()
      throws Exception {
    mockMvc
        .perform(
            post("/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"controller-forgot-unknown@example.test\"}"))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("REQUESTED"));
  }

  @Test
  void forgotPasswordReturnsTheIdenticalResponseForAKnownActiveAccount() throws Exception {
    seedActiveUser("controller-forgot-known@example.test");

    mockMvc
        .perform(
            post("/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"controller-forgot-known@example.test\"}"))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("REQUESTED"));
  }

  @Test
  void resetPasswordIsReachableWithoutAuthenticationAndUpdatesTheCredential() throws Exception {
    UUID userId = seedUnverifiedUser("controller-reset-happy-path@example.test");
    credentialRepository.save(
        Credential.issue(
            UUID.randomUUID(),
            userId,
            passwordHasher.hash(RawPassword.of(LOGIN_PASSWORD)),
            Instant.now()));
    RawToken token = seedResetToken(userId, Instant.now());

    mockMvc
        .perform(
            post("/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"token\": \""
                        + token.value()
                        + "\", \"newPassword\": \"a brand new replacement passphrase 2026\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PASSWORD_RESET"));

    String updatedHash = credentialRepository.findByUserId(userId).orElseThrow().passwordHash();
    assertThat(
            passwordHasher.matches(
                RawPassword.of("a brand new replacement passphrase 2026"), updatedHash))
        .isTrue();
  }

  @Test
  void resetPasswordRejectsAnUnknownTokenAsInvalid() throws Exception {
    mockMvc
        .perform(
            post("/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"token\": \"not-a-real-token\", \"newPassword\": \""
                        + LOGIN_PASSWORD
                        + "\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("TOKEN_INVALID"));
  }

  @Test
  void resetPasswordReportsAPasswordPolicyViolationWithoutConsumingTheToken() throws Exception {
    UUID userId = seedUnverifiedUser("controller-reset-weak-password@example.test");
    credentialRepository.save(
        Credential.issue(
            UUID.randomUUID(),
            userId,
            passwordHasher.hash(RawPassword.of(LOGIN_PASSWORD)),
            Instant.now()));
    RawToken token = seedResetToken(userId, Instant.now());

    mockMvc
        .perform(
            post("/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\": \"" + token.value() + "\", \"newPassword\": \"short\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[?(@.field == 'newPassword')]").exists());

    assertThat(resetTokenRepository.findByTokenHash(token.hash()).orElseThrow().consumedAt())
        .isEmpty();
  }

  private RawToken seedResetToken(UUID userId, Instant issuedAt) {
    RawToken token = tokenGenerator.generate();
    resetTokenRepository.save(
        new PasswordResetToken(
            UUID.randomUUID(),
            userId,
            token.hash(),
            issuedAt.plus(PasswordResetToken.TTL),
            Optional.empty(),
            issuedAt));
    return token;
  }

  private Session seedSession(UUID userId, RawToken sessionToken, RawToken csrfToken) {
    return sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userId,
            sessionToken.hash(),
            csrfToken.hash(),
            Instant.now(),
            Optional.empty()));
  }

  private void seedActiveUser(String email) {
    User user =
        userRepository.save(
            User.signup(UUID.randomUUID(), EmailAddress.of(email), "Login Test User", Instant.now())
                .verify(Instant.now()));
    credentialRepository.save(
        Credential.issue(
            UUID.randomUUID(),
            user.id(),
            passwordHasher.hash(RawPassword.of(LOGIN_PASSWORD)),
            Instant.now()));
  }

  private static String loginBody(String email, String password) {
    return "{\"email\": \"" + email + "\", \"password\": \"" + password + "\"}";
  }

  private static String extractCookieValue(String setCookieHeader) {
    String afterName =
        setCookieHeader.substring(
            setCookieHeader.indexOf("lifeos_session=") + "lifeos_session=".length());
    return afterName.substring(0, afterName.indexOf(';'));
  }

  private UUID seedUnverifiedUser(String email) {
    User user =
        userRepository.save(
            User.signup(UUID.randomUUID(), EmailAddress.of(email), "Verify Me", Instant.now()));
    return user.id();
  }

  private RawToken seedToken(UUID userId, Instant issuedAt) {
    RawToken token = tokenGenerator.generate();
    tokenRepository.save(
        new EmailVerificationToken(
            UUID.randomUUID(),
            userId,
            token.hash(),
            issuedAt.plus(EmailVerificationToken.TTL),
            Optional.empty(),
            issuedAt));
    return token;
  }
}
