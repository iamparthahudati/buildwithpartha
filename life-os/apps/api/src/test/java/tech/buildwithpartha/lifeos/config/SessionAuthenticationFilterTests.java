package tech.buildwithpartha.lifeos.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

/**
 * Proves {@link SessionAuthenticationFilter} actually does something: nothing in {@code
 * auth.api.AuthControllerTests} ever hits a route protected by {@code
 * .anyRequest().authenticated()}, since every endpoint {@code AuthController} exposes is
 * deliberately public. A tiny fixture controller here stands in for "any future protected endpoint"
 * the same way {@code ApiProblemResponseTests.ErrorFixtureController} stands in for arbitrary
 * failures.
 */
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Import(SessionAuthenticationFilterTests.ProtectedFixtureController.class)
class SessionAuthenticationFilterTests {

  private final MockMvc mockMvc;
  private final SessionRepository sessionRepository;
  private final UserRepository userRepository;
  private final SecureTokenGenerator tokenGenerator;

  @Autowired
  SessionAuthenticationFilterTests(
      MockMvc mockMvc,
      SessionRepository sessionRepository,
      UserRepository userRepository,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.sessionRepository = sessionRepository;
    this.userRepository = userRepository;
    this.tokenGenerator = tokenGenerator;
  }

  @Test
  void aRequestWithNoSessionCookieIsUnauthenticated() throws Exception {
    mockMvc.perform(get("/test/session/whoami")).andExpect(status().isUnauthorized());
  }

  @Test
  void aRequestWithAnUnknownSessionCookieIsUnauthenticated() throws Exception {
    mockMvc
        .perform(
            get("/test/session/whoami").cookie(new Cookie("lifeos_session", "not-a-real-token")))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void aValidSessionCookieAuthenticatesTheRequestWithTheSessionsUserId() throws Exception {
    UUID userId = seedActiveUser();
    RawToken token = seedSession(userId, Instant.now());

    mockMvc
        .perform(get("/test/session/whoami").cookie(new Cookie("lifeos_session", token.value())))
        .andExpect(status().isOk())
        .andExpect(content().string(userId.toString()));
  }

  @Test
  void anExpiredSessionCookieIsUnauthenticated() throws Exception {
    UUID userId = seedActiveUser();
    RawToken token = seedSession(userId, Instant.now().minus(Duration.ofDays(31)));

    mockMvc
        .perform(get("/test/session/whoami").cookie(new Cookie("lifeos_session", token.value())))
        .andExpect(status().isUnauthorized());
  }

  /**
   * {@code UNPROTECTED_AUTH_PATHS} holds bare paths like {@code /auth/login} — this proves {@link
   * #requiresCsrfValidation} actually matches them. Comparing against {@code getRequestURI()}
   * (which includes {@code server.servlet.context-path}, {@code /life-os/api/v1}) instead of {@code
   * getServletPath()} meant no bare entry ever matched, so CSRF validation silently applied to
   * every "unprotected" auth endpoint whenever a request happened to carry an active session cookie
   * — invisible until exactly that combination was hit, since a first-time
   * signup/login/forgot-password request has no session cookie yet. Verified live against a running
   * instance: a signed-in browser tab re-submitting {@code /auth/login}, or requesting {@code
   * /auth/forgot-password}, got {@code 403 CSRF_TOKEN_INVALID} instead of ever reaching the
   * controller.
   */
  @Test
  void anActiveSessionCookieDoesNotBlockAnUnprotectedAuthPathWithoutACsrfHeader() throws Exception {
    UUID userId = seedActiveUser();
    RawToken token = seedSession(userId, Instant.now());

    mockMvc
        .perform(
            post("/auth/login")
                .cookie(new Cookie("lifeos_session", token.value()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"email":"not-a-real-account@example.test","password":"wrong-password-123"}
                    """))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
  }

  private UUID seedActiveUser() {
    UUID userId = UUID.randomUUID();
    userRepository.save(
        User.signup(
                userId,
                EmailAddress.of("filter-" + userId + "@example.test"),
                "Filter Test",
                Instant.now())
            .verify(Instant.now()));
    return userId;
  }

  private RawToken seedSession(UUID userId, Instant issuedAt) {
    RawToken token = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(), userId, token.hash(), "sha256:csrf", issuedAt, Optional.empty()));
    return token;
  }

  @RestController
  @RequestMapping("/test/session")
  static class ProtectedFixtureController {

    @GetMapping("/whoami")
    String whoami(@AuthenticationPrincipal UUID userId) {
      return userId.toString();
    }
  }
}
