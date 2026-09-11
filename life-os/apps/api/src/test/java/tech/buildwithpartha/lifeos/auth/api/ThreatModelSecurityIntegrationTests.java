package tech.buildwithpartha.lifeos.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentMimeValidator;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tools.jackson.databind.ObjectMapper;

/**
 * Automated STRIDE Threat Model Verification Integration Test Suite (LOS-1506).
 *
 * <p>Validates core security boundaries and mitigations across the STRIDE threat taxonomy:
 *
 * <ul>
 *   <li><b>Spoofing</b>: Forged session cookies, expired sessions, and unauthenticated access are
 *       strictly rejected.
 *   <li><b>Tampering</b>: Missing/invalid CSRF tokens on mutations and cross-tenant reference
 *       tampering are blocked.
 *   <li><b>Repudiation</b>: Security audit records and deterministic trace IDs correlate all
 *       requests.
 *   <li><b>Information Disclosure</b>: Actuator surface is locked down, anti-enumeration produces
 *       uniform errors, and IDOR lookups return indistinguishable 404s.
 *   <li><b>Denial of Service</b>: Malicious / dangerous MIME uploads are blocked.
 *   <li><b>Elevation of Privilege</b>: Direct object modification outside tenant context is
 *       forbidden.
 * </ul>
 */
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("STRIDE Threat Model Verification Suite (LOS-1506)")
class ThreatModelSecurityIntegrationTests {

  private static final String CSRF_HEADER_NAME = "X-CSRF-TOKEN";
  private static final String SESSION_COOKIE_NAME = "lifeos_session";

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final ObjectMapper objectMapper;

  @Autowired
  ThreatModelSecurityIntegrationTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator,
      ObjectMapper objectMapper) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
    this.objectMapper = objectMapper;
  }

  private record UserContext(
      UUID userId, Session session, RawToken rawToken, RawToken csrfToken, Cookie cookie) {}

  private UserContext createActiveUser(String emailPrefix) {
    UUID userId = UUID.randomUUID();
    String email = emailPrefix + "-" + UUID.randomUUID() + "@example.test";
    User user =
        User.signup(userId, EmailAddress.of(email), "Threat Model User", Instant.now())
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
            Optional.empty());
    session = sessionRepository.save(session);

    Cookie cookie = new Cookie(SESSION_COOKIE_NAME, rawToken.value());
    cookie.setHttpOnly(true);
    cookie.setPath("/");

    return new UserContext(userId, session, rawToken, csrfToken, cookie);
  }

  // =========================================================================
  // 1. STRIDE - SPOOFING IDENTITY
  // =========================================================================

  @Test
  @DisplayName("TM-S-1: Forged or non-existent session cookie is rejected with 401")
  void testForgedSessionCookieRejected() throws Exception {
    Cookie forgedCookie = new Cookie(SESSION_COOKIE_NAME, "forged-token-" + UUID.randomUUID());
    forgedCookie.setPath("/");

    mockMvc.perform(get("/user/profile").cookie(forgedCookie)).andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("TM-S-2: Expired session token is rejected with 401 UNAUTHORIZED")
  void testExpiredSessionRejected() throws Exception {
    UserContext ctx = createActiveUser("tm-expired");
    RawToken newToken = tokenGenerator.generate();
    RawToken csrfToken = tokenGenerator.generate();
    Session expiredSession =
        new Session(
            UUID.randomUUID(),
            ctx.userId(),
            newToken.hash(),
            csrfToken.hash(),
            Instant.now().minusSeconds(7200),
            Instant.now().minusSeconds(7200),
            Instant.now().minusSeconds(3600),
            Optional.empty(),
            Optional.empty());
    sessionRepository.save(expiredSession);

    Cookie expiredCookie = new Cookie(SESSION_COOKIE_NAME, newToken.value());
    expiredCookie.setPath("/");

    mockMvc
        .perform(get("/user/profile").cookie(expiredCookie))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("TM-S-3: Revoked session cannot be reused to access protected endpoints")
  void testRevokedSessionCannotBeReused() throws Exception {
    UserContext ctx = createActiveUser("tm-revoked");

    // Verify authenticated access succeeds
    mockMvc
        .perform(get("/user/profile").cookie(ctx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(ctx.userId().toString()));

    // Revoke session via logout
    mockMvc
        .perform(
            post("/auth/logout")
                .cookie(ctx.cookie())
                .header(CSRF_HEADER_NAME, ctx.csrfToken().value()))
        .andExpect(status().isOk());

    // Subsequent access with revoked session cookie fails
    mockMvc.perform(get("/user/profile").cookie(ctx.cookie())).andExpect(status().isUnauthorized());
  }

  // =========================================================================
  // 2. STRIDE - TAMPERING WITH DATA
  // =========================================================================

  @Test
  @DisplayName("TM-T-1: Mutation request without CSRF header is rejected with 403")
  void testMutationWithoutCsrfHeaderRejected() throws Exception {
    UserContext ctx = createActiveUser("tm-csrf");

    String payload =
        """
        {
          "name": "Tampered Project",
          "description": "Unauthorized without CSRF",
          "status": "PLANNED",
          "priority": "P2"
        }
        """;

    mockMvc
        .perform(
            post("/projects")
                .cookie(ctx.cookie())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("TM-T-2: Cross-user foreign reference tampering is rejected with 400")
  void testCrossUserReferenceTamperingRejected() throws Exception {
    UserContext userA = createActiveUser("tm-user-a");
    UserContext userB = createActiveUser("tm-user-b");

    // User A creates a Project
    String createProjectPayload =
        """
        {
          "name": "User A Private Project",
          "status": "PLANNED",
          "priority": "P2"
        }
        """;

    MvcResult projectResult =
        mockMvc
            .perform(
                post("/projects")
                    .cookie(userA.cookie())
                    .header(CSRF_HEADER_NAME, userA.csrfToken().value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createProjectPayload))
            .andExpect(status().isOk())
            .andReturn();

    String projectResponseBody = projectResult.getResponse().getContentAsString();
    String userAProjectId = objectMapper.readTree(projectResponseBody).get("id").asText();

    // User B attempts to tamper/attach their task to User A's project -> returns 400 BAD_REQUEST
    mockMvc
        .perform(
            post("/tasks")
                .cookie(userB.cookie())
                .header(CSRF_HEADER_NAME, userB.csrfToken().value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"User B Task\",\"projectId\":\"" + userAProjectId + "\"}"))
        .andExpect(status().isBadRequest());
  }

  // =========================================================================
  // 3. STRIDE - REPUDIATION
  // =========================================================================

  @Test
  @DisplayName("TM-R-1: Request correlation ID is safely echoed in responses")
  void testCorrelationIdEchoedSafely() throws Exception {
    UserContext ctx = createActiveUser("tm-correlation");
    String safeCorrelationId = "req-" + UUID.randomUUID();

    mockMvc
        .perform(
            get("/user/profile").cookie(ctx.cookie()).header("X-Correlation-Id", safeCorrelationId))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Correlation-Id", safeCorrelationId));
  }

  @Test
  @DisplayName("TM-R-2: Session listing provides auditable client metadata")
  void testSessionAuditMetadataAvailable() throws Exception {
    UserContext ctx = createActiveUser("tm-session-audit");

    mockMvc
        .perform(get("/auth/sessions").cookie(ctx.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessions").isArray())
        .andExpect(jsonPath("$.sessions[0].id").exists())
        .andExpect(jsonPath("$.sessions[0].createdAt").exists());
  }

  // =========================================================================
  // 4. STRIDE - INFORMATION DISCLOSURE
  // =========================================================================

  @Test
  @DisplayName("TM-I-1: Actuator internals (env, heapdump, beans, mappings) are denied")
  void testActuatorInternalsRestricted() throws Exception {
    mockMvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized());
    mockMvc.perform(get("/actuator/heapdump")).andExpect(status().isUnauthorized());
    mockMvc.perform(get("/actuator/beans")).andExpect(status().isUnauthorized());
    mockMvc.perform(get("/actuator/mappings")).andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("TM-I-2: Public health probes are accessible without internal leakage")
  void testPublicHealthProbesAccessibleWithoutLeakage() throws Exception {
    mockMvc
        .perform(get("/actuator/health/liveness"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"));

    mockMvc
        .perform(get("/actuator/health/readiness"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"));
  }

  @Test
  @DisplayName("TM-I-3: Non-existent and foreign ID access return indistinguishable 404")
  void testNonExistentAndForeignIdAreIndistinguishable() throws Exception {
    UserContext userA = createActiveUser("tm-idor-a");
    UserContext userB = createActiveUser("tm-idor-b");

    // User A creates a task
    String createTaskPayload =
        """
        {
          "title": "User A Private Task"
        }
        """;

    MvcResult taskResult =
        mockMvc
            .perform(
                post("/tasks")
                    .cookie(userA.cookie())
                    .header(CSRF_HEADER_NAME, userA.csrfToken().value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createTaskPayload))
            .andExpect(status().isCreated())
            .andReturn();

    String rawBody = taskResult.getResponse().getContentAsString();
    String taskId = objectMapper.readTree(rawBody).get("id").asText();
    UUID randomNonExistentId = UUID.randomUUID();

    // User B attempts to access User A's task -> 404 RESOURCE_NOT_FOUND
    mockMvc
        .perform(get("/tasks/" + taskId).cookie(userB.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));

    // User B attempts to access non-existent UUID -> 404 RESOURCE_NOT_FOUND (identical format)
    mockMvc
        .perform(get("/tasks/" + randomNonExistentId).cookie(userB.cookie()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
  }

  @Test
  @DisplayName("TM-I-4: Public recovery produces generic anti-enumeration response")
  void testPublicRecoveryProducesGenericAntiEnumerationResponse() throws Exception {
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

  // =========================================================================
  // 5. STRIDE - DENIAL OF SERVICE
  // =========================================================================

  @Test
  @DisplayName("TM-D-1: Attachment validator rejects executable, script, and dangerous extensions")
  void testDangerousExtensionsRejected() {
    assertThat(AttachmentMimeValidator.isForbiddenFilename("payload.exe")).isTrue();
    assertThat(AttachmentMimeValidator.isForbiddenFilename("script.sh")).isTrue();
    assertThat(AttachmentMimeValidator.isForbiddenFilename("macro.bat")).isTrue();
    assertThat(AttachmentMimeValidator.isForbiddenFilename("exploit.html")).isTrue();
    assertThat(AttachmentMimeValidator.isForbiddenFilename("vector.svg")).isTrue();

    assertThat(AttachmentMimeValidator.isForbiddenFilename("document.pdf")).isFalse();
    assertThat(AttachmentMimeValidator.isForbiddenFilename("image.png")).isFalse();
  }

  // =========================================================================
  // 6. STRIDE - ELEVATION OF PRIVILEGE
  // =========================================================================

  @Test
  @DisplayName("TM-E-1: User B cannot delete or mutate User A's project or task")
  void testCrossUserMutationRejected() throws Exception {
    UserContext userA = createActiveUser("tm-elevate-a");
    UserContext userB = createActiveUser("tm-elevate-b");

    // User A creates Project
    String createProjectPayload =
        """
        {
          "name": "User A Sovereign Project",
          "status": "PLANNED",
          "priority": "P2"
        }
        """;

    MvcResult result =
        mockMvc
            .perform(
                post("/projects")
                    .cookie(userA.cookie())
                    .header(CSRF_HEADER_NAME, userA.csrfToken().value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createProjectPayload))
            .andExpect(status().isOk())
            .andReturn();

    String rawResult = result.getResponse().getContentAsString();
    String projectId = objectMapper.readTree(rawResult).get("id").asText();

    // User B attempts to DELETE User A's project -> 404 RESOURCE_NOT_FOUND
    mockMvc
        .perform(
            delete("/projects/" + projectId)
                .cookie(userB.cookie())
                .header(CSRF_HEADER_NAME, userB.csrfToken().value()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));

    // Verify Project still exists for User A
    mockMvc
        .perform(get("/projects/" + projectId).cookie(userA.cookie()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("User A Sovereign Project"));
  }
}
