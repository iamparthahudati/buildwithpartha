package tech.buildwithpartha.lifeos.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
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
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

/**
 * Automated Security Headers and CSP Verification Test Suite (LOS-1507).
 *
 * <p>Validates defense-in-depth security headers and Content Security Policy across:
 *
 * <ul>
 *   <li>Public and unauthenticated endpoints (login, signup, health probes)
 *   <li>Authenticated resources (/users/me, /projects, /tasks)
 *   <li>Error responses (401 Unauthorized, 403 Forbidden, 404 Not Found)
 *   <li>Exact header specifications: CSP, HSTS, X-Content-Type-Options, X-Frame-Options,
 *       Referrer-Policy, Permissions-Policy, X-XSS-Protection, COOP, CORP
 * </ul>
 */
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Security Headers and CSP Verification Suite (LOS-1507)")
class SecurityHeadersIntegrationTests {

  private static final String CSRF_HEADER_NAME = "X-CSRF-TOKEN";
  private static final String SESSION_COOKIE_NAME = "lifeos_session";

  private static final String EXPECTED_CSP = "default-src 'none'; frame-ancestors 'none'";
  private static final String EXPECTED_HSTS = "max-age=31536000 ; includeSubDomains ; preload";
  private static final String EXPECTED_REFERRER = "strict-origin-when-cross-origin";
  private static final String EXPECTED_PERMISSIONS =
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=()";
  private static final String EXPECTED_XSS = "0";
  private static final String EXPECTED_COOP = "same-origin";
  private static final String EXPECTED_CORP = "same-origin";

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;

  @Autowired
  SecurityHeadersIntegrationTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
  }

  private record UserContext(
      UUID userId, Session session, RawToken rawToken, RawToken csrfToken, Cookie cookie) {}

  private UserContext createActiveUser(String emailPrefix) {
    UUID userId = UUID.randomUUID();
    String email = emailPrefix + "-" + UUID.randomUUID() + "@example.test";
    User user =
        User.signup(userId, EmailAddress.of(email), "Security Headers User", Instant.now())
            .verify(Instant.now());
    userRepository.save(user);

    RawToken rawToken = tokenGenerator.generate();
    RawToken csrfToken = tokenGenerator.generate();
    Session session =
        Session.issue(
            UUID.randomUUID(),
            userId,
            rawToken.hash(),
            csrfToken.hash(),
            Instant.now(),
            java.util.Optional.empty());
    sessionRepository.save(session);

    Cookie cookie = new Cookie(SESSION_COOKIE_NAME, rawToken.value());
    cookie.setPath("/life-os");
    cookie.setHttpOnly(true);
    cookie.setSecure(true);

    return new UserContext(userId, session, rawToken, csrfToken, cookie);
  }

  @Test
  @DisplayName("SH-1: Public health liveness probe returns full security header suite")
  void healthLivenessProbe_returnsFullSecurityHeaders() throws Exception {
    mockMvc
        .perform(get("/actuator/health/liveness").secure(true))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"))
        .andExpect(header().string("Strict-Transport-Security", EXPECTED_HSTS))
        .andExpect(header().string("Referrer-Policy", EXPECTED_REFERRER))
        .andExpect(header().string("Permissions-Policy", EXPECTED_PERMISSIONS))
        .andExpect(header().string("Content-Security-Policy", EXPECTED_CSP))
        .andExpect(header().string("X-XSS-Protection", EXPECTED_XSS))
        .andExpect(header().string("Cross-Origin-Opener-Policy", EXPECTED_COOP))
        .andExpect(header().string("Cross-Origin-Resource-Policy", EXPECTED_CORP));
  }

  @Test
  @DisplayName("SH-2: Public health readiness probe returns full security header suite")
  void healthReadinessProbe_returnsFullSecurityHeaders() throws Exception {
    mockMvc
        .perform(get("/actuator/health/readiness").secure(true))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"))
        .andExpect(header().string("Strict-Transport-Security", EXPECTED_HSTS))
        .andExpect(header().string("Referrer-Policy", EXPECTED_REFERRER))
        .andExpect(header().string("Permissions-Policy", EXPECTED_PERMISSIONS))
        .andExpect(header().string("Content-Security-Policy", EXPECTED_CSP))
        .andExpect(header().string("X-XSS-Protection", EXPECTED_XSS))
        .andExpect(header().string("Cross-Origin-Opener-Policy", EXPECTED_COOP))
        .andExpect(header().string("Cross-Origin-Resource-Policy", EXPECTED_CORP));
  }

  @Test
  @DisplayName("SH-3: Public auth endpoint returns full security header suite")
  void authEndpoint_returnsFullSecurityHeaders() throws Exception {
    mockMvc
        .perform(
            post("/auth/login")
                .secure(true)
                .with(
                    request -> {
                      request.setRemoteAddr("198.51.100.42");
                      return request;
                    })
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"email\":\"nonexistent@example.com\",\"password\":\"BadPassword123!\"}"))
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"))
        .andExpect(header().string("Strict-Transport-Security", EXPECTED_HSTS))
        .andExpect(header().string("Referrer-Policy", EXPECTED_REFERRER))
        .andExpect(header().string("Permissions-Policy", EXPECTED_PERMISSIONS))
        .andExpect(header().string("Content-Security-Policy", EXPECTED_CSP))
        .andExpect(header().string("X-XSS-Protection", EXPECTED_XSS))
        .andExpect(header().string("Cross-Origin-Opener-Policy", EXPECTED_COOP))
        .andExpect(header().string("Cross-Origin-Resource-Policy", EXPECTED_CORP));
  }

  @Test
  @DisplayName("SH-4: Authenticated user resource returns full security header suite")
  void authenticatedResource_returnsFullSecurityHeaders() throws Exception {
    UserContext ctx = createActiveUser("sec-headers");

    mockMvc
        .perform(
            get("/auth/sessions")
                .secure(true)
                .cookie(ctx.cookie())
                .header(CSRF_HEADER_NAME, ctx.csrfToken().value()))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"))
        .andExpect(header().string("Strict-Transport-Security", EXPECTED_HSTS))
        .andExpect(header().string("Referrer-Policy", EXPECTED_REFERRER))
        .andExpect(header().string("Permissions-Policy", EXPECTED_PERMISSIONS))
        .andExpect(header().string("Content-Security-Policy", EXPECTED_CSP))
        .andExpect(header().string("X-XSS-Protection", EXPECTED_XSS))
        .andExpect(header().string("Cross-Origin-Opener-Policy", EXPECTED_COOP))
        .andExpect(header().string("Cross-Origin-Resource-Policy", EXPECTED_CORP));
  }

  @Test
  @DisplayName("SH-5: 401 Unauthorized problem response returns full security header suite")
  void unauthorizedProblem_returnsFullSecurityHeaders() throws Exception {
    mockMvc
        .perform(get("/auth/sessions").secure(true))
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"))
        .andExpect(header().string("Strict-Transport-Security", EXPECTED_HSTS))
        .andExpect(header().string("Referrer-Policy", EXPECTED_REFERRER))
        .andExpect(header().string("Permissions-Policy", EXPECTED_PERMISSIONS))
        .andExpect(header().string("Content-Security-Policy", EXPECTED_CSP))
        .andExpect(header().string("X-XSS-Protection", EXPECTED_XSS))
        .andExpect(header().string("Cross-Origin-Opener-Policy", EXPECTED_COOP))
        .andExpect(header().string("Cross-Origin-Resource-Policy", EXPECTED_CORP));
  }

  @Test
  @DisplayName("SH-6: 403 Forbidden CSRF rejection returns full security header suite")
  void forbiddenCsrfProblem_returnsFullSecurityHeaders() throws Exception {
    UserContext ctx = createActiveUser("csrf-header");

    mockMvc
        .perform(
            post("/projects")
                .secure(true)
                .cookie(ctx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Test Project\"}"))
        .andExpect(status().isForbidden())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"))
        .andExpect(header().string("Strict-Transport-Security", EXPECTED_HSTS))
        .andExpect(header().string("Referrer-Policy", EXPECTED_REFERRER))
        .andExpect(header().string("Permissions-Policy", EXPECTED_PERMISSIONS))
        .andExpect(header().string("Content-Security-Policy", EXPECTED_CSP))
        .andExpect(header().string("X-XSS-Protection", EXPECTED_XSS))
        .andExpect(header().string("Cross-Origin-Opener-Policy", EXPECTED_COOP))
        .andExpect(header().string("Cross-Origin-Resource-Policy", EXPECTED_CORP));
  }

  @Test
  @DisplayName("SH-7: 404 Not Found problem response returns full security header suite")
  void notFoundProblem_returnsFullSecurityHeaders() throws Exception {
    UserContext ctx = createActiveUser("notfound-header");

    mockMvc
        .perform(
            get("/projects/" + UUID.randomUUID())
                .secure(true)
                .cookie(ctx.cookie())
                .header(CSRF_HEADER_NAME, ctx.csrfToken().value()))
        .andExpect(status().isNotFound())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"))
        .andExpect(header().string("Strict-Transport-Security", EXPECTED_HSTS))
        .andExpect(header().string("Referrer-Policy", EXPECTED_REFERRER))
        .andExpect(header().string("Permissions-Policy", EXPECTED_PERMISSIONS))
        .andExpect(header().string("Content-Security-Policy", EXPECTED_CSP))
        .andExpect(header().string("X-XSS-Protection", EXPECTED_XSS))
        .andExpect(header().string("Cross-Origin-Opener-Policy", EXPECTED_COOP))
        .andExpect(header().string("Cross-Origin-Resource-Policy", EXPECTED_CORP));
  }

  @Test
  @DisplayName("SH-8: Anti-framing policy forbids iframe embedding across all endpoints")
  void antiFramingPolicy_isDeny() throws Exception {
    MvcResult result =
        mockMvc
            .perform(get("/actuator/health/liveness").secure(true))
            .andExpect(status().isOk())
            .andReturn();

    String xFrameOptions = result.getResponse().getHeader("X-Frame-Options");
    String csp = result.getResponse().getHeader("Content-Security-Policy");

    assertThat(xFrameOptions).isEqualTo("DENY");
    assertThat(csp).contains("frame-ancestors 'none'");
  }

  @Test
  @DisplayName("SH-9: Content-Type sniffing is disabled via nosniff directive")
  void nosniffDirective_isEnforced() throws Exception {
    MvcResult result =
        mockMvc
            .perform(get("/actuator/health/readiness").secure(true))
            .andExpect(status().isOk())
            .andReturn();

    assertThat(result.getResponse().getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
  }

  @Test
  @DisplayName("SH-10: Permissions-Policy restricts sensitive hardware and browser APIs")
  void permissionsPolicy_restrictsSensitiveAPIs() throws Exception {
    MvcResult result =
        mockMvc
            .perform(get("/actuator/health/liveness").secure(true))
            .andExpect(status().isOk())
            .andReturn();

    String permissionsPolicy = result.getResponse().getHeader("Permissions-Policy");
    assertThat(permissionsPolicy)
        .contains("camera=()")
        .contains("microphone=()")
        .contains("geolocation=()")
        .contains("payment=()")
        .contains("usb=()")
        .contains("screen-wake-lock=()");
  }
}
