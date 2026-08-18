package tech.buildwithpartha.lifeos.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
