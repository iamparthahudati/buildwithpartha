package tech.buildwithpartha.lifeos.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

/**
 * Exercises {@code POST /auth/signup}, {@code POST /auth/verify-email} and {@code POST /auth/login}
 * through the real filter chain (no {@code @WithMockUser}: the whole point of all three endpoints
 * is that they are reachable without a session) and the real {@code SignupService}/{@code
 * EmailVerificationService}/{@code LoginService}/JPA/Argon2/wordlist beans, matching the
 * full-context style {@code ApiProblemResponseTests} and {@code OpenApiArtifactTests} already use.
 * Whether the session cookie a successful login issues actually authenticates a later request is
 * {@code SessionAuthenticationFilterTests}' job, not this class's — everything here stays scoped to
 * the login endpoint's own request/response contract.
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
  private final SecureTokenGenerator tokenGenerator;
  private final PasswordHasher passwordHasher;

  @Autowired
  AuthControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      CredentialRepository credentialRepository,
      EmailVerificationTokenRepository tokenRepository,
      SecureTokenGenerator tokenGenerator,
      PasswordHasher passwordHasher) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.credentialRepository = credentialRepository;
    this.tokenRepository = tokenRepository;
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
