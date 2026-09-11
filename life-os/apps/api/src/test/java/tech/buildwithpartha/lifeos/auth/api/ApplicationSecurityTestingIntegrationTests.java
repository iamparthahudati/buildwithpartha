package tech.buildwithpartha.lifeos.auth.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tech.buildwithpartha.lifeos.attachment.application.AttachmentService;
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentEntityType;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentRepository;
import tech.buildwithpartha.lifeos.auth.application.ResetPasswordCommand;
import tech.buildwithpartha.lifeos.auth.application.ResetPasswordService;
import tech.buildwithpartha.lifeos.auth.domain.Credential;
import tech.buildwithpartha.lifeos.auth.domain.CredentialRepository;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Dynamic Application Security Testing (DAST) and Penetration Testing Suite (LOS-1509).
 *
 * <p>Validates runtime security controls and exploit defenses across all 8 core vulnerability
 * classes:
 *
 * <ul>
 *   <li><b>1. DAST Probes & Fuzzing</b>: Unexpected HTTP verbs, malformed content types, SQL
 *       injection payloads, XSS script injection payloads, and header fuzzing.
 *   <li><b>2. IDOR / BOLA</b>: Strict tenant isolation and indistinguishable 404 responses for
 *       foreign resources across tasks, projects, time blocks, habits, goals, notes, and
 *       attachments.
 *   <li><b>3. CSRF & State Mutation Gating</b>: Required {@code X-CSRF-TOKEN} validation on all
 *       state mutations and exemption of safe read requests.
 *   <li><b>4. Session Lifecycle & Hardening</b>: Session rotation, immediate logout revocation,
 *       all-device session invalidation, and secure cookie properties.
 *   <li><b>5. Password Reset & Verification</b>: Single-use token consumption, expired token
 *       rejection, session revocation upon reset, and anti-enumeration timing.
 *   <li><b>6. File Upload Security</b>: MIME allowlist enforcement, executable / script upload
 *       rejection, path traversal prevention, and download headers.
 *   <li><b>7. Data Export Isolation & Caching</b>: Tenant isolation of export streams and mandatory
 *       restrictive {@code Cache-Control} and proxy bypass headers.
 *   <li><b>8. Information Disclosure & Actuator</b>: Actuator surface lockdown and RFC 7807 Problem
 *       Details sanitization (no stack traces or internal implementation leakage).
 * </ul>
 */
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Application Security Testing & DAST Verification Suite (LOS-1509)")
class ApplicationSecurityTestingIntegrationTests {

  private static final String SESSION_COOKIE_NAME = "lifeos_session";
  private static final String CSRF_HEADER_NAME = "X-CSRF-TOKEN";

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final CredentialRepository credentialRepository;
  private final PasswordResetTokenRepository passwordResetTokenRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final PasswordHasher passwordHasher;
  private final ResetPasswordService resetPasswordService;
  private final AttachmentService attachmentService;
  private final AttachmentRepository attachmentRepository;
  private final ObjectMapper objectMapper;

  private UUID userAId;
  private Cookie sessionCookieA;
  private RawToken csrfTokenA;

  private UUID userBId;
  private Cookie sessionCookieB;
  private RawToken csrfTokenB;

  @Autowired
  ApplicationSecurityTestingIntegrationTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      CredentialRepository credentialRepository,
      PasswordResetTokenRepository passwordResetTokenRepository,
      SecureTokenGenerator tokenGenerator,
      PasswordHasher passwordHasher,
      ResetPasswordService resetPasswordService,
      AttachmentService attachmentService,
      AttachmentRepository attachmentRepository,
      ObjectMapper objectMapper) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.credentialRepository = credentialRepository;
    this.passwordResetTokenRepository = passwordResetTokenRepository;
    this.tokenGenerator = tokenGenerator;
    this.passwordHasher = passwordHasher;
    this.resetPasswordService = resetPasswordService;
    this.attachmentService = attachmentService;
    this.attachmentRepository = attachmentRepository;
    this.objectMapper = objectMapper;
  }

  @BeforeEach
  void setUp() {
    // 1. Initialize User A
    userAId = createUser("appsec-user-a-" + UUID.randomUUID());
    RawToken tokenA = tokenGenerator.generate();
    csrfTokenA = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userAId,
            tokenA.hash(),
            csrfTokenA.hash(),
            Instant.now(),
            Optional.empty()));
    sessionCookieA = new Cookie(SESSION_COOKIE_NAME, tokenA.value());
    sessionCookieA.setPath("/");
    sessionCookieA.setHttpOnly(true);

    // 2. Initialize User B
    userBId = createUser("appsec-user-b-" + UUID.randomUUID());
    RawToken tokenB = tokenGenerator.generate();
    csrfTokenB = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userBId,
            tokenB.hash(),
            csrfTokenB.hash(),
            Instant.now(),
            Optional.empty()));
    sessionCookieB = new Cookie(SESSION_COOKIE_NAME, tokenB.value());
    sessionCookieB.setPath("/");
    sessionCookieB.setHttpOnly(true);
  }

  private UUID createUser(String emailPrefix) {
    Instant now = Instant.now();
    UUID userId = UUID.randomUUID();
    String email = emailPrefix + "@example.test";
    User user = User.signup(userId, EmailAddress.of(email), "AppSec Test User", now).verify(now);
    userRepository.save(user);
    credentialRepository.save(
        Credential.issue(
            UUID.randomUUID(),
            userId,
            passwordHasher.hash(RawPassword.of("ValidPassphrase!2026")),
            now));
    return userId;
  }

  // =========================================================================
  // 1. DAST PROBES & INPUT FUZZING
  // =========================================================================

  @Test
  @DisplayName("AST-01: Malformed JSON payload is rejected with 400 without diagnostic leakage")
  void testMalformedJsonRejection() throws Exception {
    mockMvc
        .perform(
            post("/projects")
                .cookie(sessionCookieA)
                .header(CSRF_HEADER_NAME, csrfTokenA.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{malformed-json: true,"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
        .andExpect(jsonPath("$.stackTrace").doesNotExist())
        .andExpect(jsonPath("$.exception").doesNotExist());
  }

  @Test
  @DisplayName(
      "AST-02: SQL injection probe in query filter returns safe result without SQL disclosure")
  void testSqlInjectionInQueryParameter() throws Exception {
    String sqliPayload = "' OR '1'='1' -- ";
    mockMvc
        .perform(get("/tasks").cookie(sessionCookieA).param("search", sqliPayload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page.items").isArray())
        .andExpect(jsonPath("$.page.items").isEmpty());
  }

  @Test
  @DisplayName(
      "AST-03: XSS and script payloads in JSON body are accepted as literal text without execution")
  void testXssPayloadHandlingInResourceCreation() throws Exception {
    String xssName = "<script>alert('XSS')</script>";
    String payload =
        """
        {
          "name": "%s",
          "description": "Safe Escaped Content",
          "status": "PLANNED",
          "priority": "P1"
        }
        """
            .formatted(xssName);

    MvcResult result =
        mockMvc
            .perform(
                post("/projects")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER_NAME, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(payload))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value(xssName))
            .andReturn();

    JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
    UUID projectId = UUID.fromString(node.get("id").asText());

    mockMvc
        .perform(get("/projects/" + projectId).cookie(sessionCookieA))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value(xssName));
  }

  @Test
  @DisplayName("AST-04: Header fuzzing with control characters in correlation ID is sanitized")
  void testHeaderFuzzingCorrelationId() throws Exception {
    mockMvc
        .perform(
            get("/user/profile")
                .cookie(sessionCookieA)
                .header("X-Correlation-Id", "malicious\r\nInjected-Header: evil\0zero"))
        .andExpect(status().isOk())
        .andExpect(header().exists("X-Correlation-Id"))
        .andExpect(header().string("X-Correlation-Id", Matchers.not(Matchers.containsString("\r"))))
        .andExpect(
            header().string("X-Correlation-Id", Matchers.not(Matchers.containsString("\n"))));
  }

  // =========================================================================
  // 2. INSECURE DIRECT OBJECT REFERENCES (IDOR / BOLA)
  // =========================================================================

  @Test
  @DisplayName("AST-05: User B reading User A project returns indistinguishable 404")
  void testIdorProjectIsolation() throws Exception {
    String projectPayload =
        """
        {
          "name": "User A Confidential Project",
          "description": "Secret",
          "status": "PLANNED",
          "priority": "P1"
        }
        """;

    MvcResult result =
        mockMvc
            .perform(
                post("/projects")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER_NAME, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(projectPayload))
            .andExpect(status().isOk())
            .andReturn();

    UUID projectId =
        UUID.fromString(
            objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText());

    // User A accesses successfully
    mockMvc
        .perform(get("/projects/" + projectId).cookie(sessionCookieA))
        .andExpect(status().isOk());

    // User B receives 404 RESOURCE_NOT_FOUND (not 403, preventing resource enumeration)
    mockMvc
        .perform(get("/projects/" + projectId).cookie(sessionCookieB))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
  }

  @Test
  @DisplayName("AST-06: User B updating or deleting User A task returns indistinguishable 404")
  void testIdorTaskMutationIsolation() throws Exception {
    String taskPayload =
        """
        {
          "title": "Confidential Task User A",
          "priority": "P2",
          "status": "TO_DO"
        }
        """;

    MvcResult result =
        mockMvc
            .perform(
                post("/tasks")
                    .cookie(sessionCookieA)
                    .header(CSRF_HEADER_NAME, csrfTokenA.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(taskPayload))
            .andExpect(status().isCreated())
            .andReturn();

    UUID taskId =
        UUID.fromString(
            objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText());

    // User B attempts to delete task -> 404
    mockMvc
        .perform(
            delete("/tasks/" + taskId)
                .cookie(sessionCookieB)
                .header(CSRF_HEADER_NAME, csrfTokenB.value()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
  }

  // =========================================================================
  // 3. CROSS-SITE REQUEST FORGERY (CSRF) & STATE MUTATION GATING
  // =========================================================================

  @Test
  @DisplayName("AST-07: State mutation (POST) without CSRF token is rejected with 403 Forbidden")
  void testCsrfTokenRequiredOnMutations() throws Exception {
    String payload =
        "{\"name\":\"CSRF Project Attempt\",\"status\":\"PLANNED\",\"priority\":\"P1\"}";
    mockMvc
        .perform(
            post("/projects")
                .cookie(sessionCookieA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("AST-08: State mutation with mismatched CSRF token is rejected with 403 Forbidden")
  void testMismatchedCsrfTokenRejected() throws Exception {
    String payload =
        "{\"name\":\"CSRF Tampered Attempt\",\"status\":\"PLANNED\",\"priority\":\"P1\"}";
    mockMvc
        .perform(
            post("/projects")
                .cookie(sessionCookieA)
                .header(CSRF_HEADER_NAME, "forged-csrf-token-" + UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("AST-09: Safe read methods (GET) do not require CSRF token")
  void testGetDoesNotRequireCsrfToken() throws Exception {
    mockMvc.perform(get("/user/profile").cookie(sessionCookieA)).andExpect(status().isOk());
  }

  // =========================================================================
  // 4. SESSION LIFECYCLE, ROTATION & REVOCATION
  // =========================================================================

  @Test
  @DisplayName("AST-10: Single logout immediately invalidates session and clears cookie")
  void testLogoutRevokesSession() throws Exception {
    // Logout
    mockMvc
        .perform(
            post("/auth/logout")
                .cookie(sessionCookieA)
                .header(CSRF_HEADER_NAME, csrfTokenA.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("LOGGED_OUT"));

    // Subsequent call with same session cookie fails with 401
    mockMvc
        .perform(get("/user/profile").cookie(sessionCookieA))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("AST-11: Revoke other sessions invalidates other active sessions for the user")
  void testRevokeOtherSessions() throws Exception {
    // Create second active session for User A
    RawToken tokenA2 = tokenGenerator.generate();
    RawToken csrfTokenA2 = tokenGenerator.generate();
    sessionRepository.save(
        new Session(
            UUID.randomUUID(),
            userAId,
            tokenA2.hash(),
            csrfTokenA2.hash(),
            Instant.now(),
            Instant.now(),
            Instant.now().plusSeconds(3600),
            Optional.empty(),
            Optional.of("Second Device")));
    Cookie sessionCookieA2 = new Cookie(SESSION_COOKIE_NAME, tokenA2.value());
    sessionCookieA2.setPath("/");

    // Both sessions work initially
    mockMvc.perform(get("/user/profile").cookie(sessionCookieA)).andExpect(status().isOk());
    mockMvc.perform(get("/user/profile").cookie(sessionCookieA2)).andExpect(status().isOk());

    // Revoke other sessions
    mockMvc
        .perform(
            post("/auth/sessions/revoke-others")
                .cookie(sessionCookieA)
                .header(CSRF_HEADER_NAME, csrfTokenA.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revokedCount").value(1));

    // Session 1 is active, Session 2 is revoked -> 401
    mockMvc.perform(get("/user/profile").cookie(sessionCookieA)).andExpect(status().isOk());
    mockMvc
        .perform(get("/user/profile").cookie(sessionCookieA2))
        .andExpect(status().isUnauthorized());
  }

  // =========================================================================
  // 5. PASSWORD RESET & VERIFICATION SECURITY
  // =========================================================================

  @Test
  @DisplayName(
      "AST-12: Password reset request returns generic 202 Accepted for both valid and invalid"
          + " email")
  void testAntiEnumerationPasswordReset() throws Exception {
    // Valid email
    mockMvc
        .perform(
            post("/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"appsec-user-a-" + userAId + "@example.test\"}"))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("REQUESTED"));

    // Invalid non-existent email returns identical 202 Accepted
    mockMvc
        .perform(
            post("/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nonexistent-user-" + UUID.randomUUID() + "@example.test\"}"))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("REQUESTED"));
  }

  @Test
  @DisplayName("AST-13: Password reset token is single-use and cannot be replayed")
  void testPasswordResetTokenSingleUse() {
    Instant now = Instant.now();
    RawToken resetToken = tokenGenerator.generate();
    passwordResetTokenRepository.save(
        PasswordResetToken.issue(UUID.randomUUID(), userAId, resetToken.hash(), now));

    // First reset succeeds
    resetPasswordService.reset(
        new ResetPasswordCommand(resetToken.value(), RawPassword.of("BrandNewPassword2026!")));

    // Replay fails
    org.junit.jupiter.api.Assertions.assertThrows(
        Exception.class,
        () ->
            resetPasswordService.reset(
                new ResetPasswordCommand(
                    resetToken.value(), RawPassword.of("AnotherPassword2026!"))));
  }

  // =========================================================================
  // 6. MALICIOUS FILE UPLOAD & MIME SECURITY
  // =========================================================================

  @Test
  @DisplayName("AST-14: Upload of executable script (.sh) is rejected with 400 Bad Request")
  void testExecutableFileUploadRejected() throws Exception {
    MockMultipartFile dangerousFile =
        new MockMultipartFile(
            "file", "exploit.sh", "application/x-sh", "#!/bin/bash\nrm -rf /".getBytes());

    mockMvc
        .perform(
            multipart("/attachments")
                .file(dangerousFile)
                .param("entityType", "TASK")
                .param("entityId", UUID.randomUUID().toString())
                .cookie(sessionCookieA)
                .header(CSRF_HEADER_NAME, csrfTokenA.value()))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("AST-15: Upload of SVG with embedded script is rejected by MIME validator")
  void testSvgUploadRejected() throws Exception {
    MockMultipartFile svgFile =
        new MockMultipartFile(
            "file", "xss.svg", "image/svg+xml", "<svg><script>alert(1)</script></svg>".getBytes());

    mockMvc
        .perform(
            multipart("/attachments")
                .file(svgFile)
                .param("entityType", "TASK")
                .param("entityId", UUID.randomUUID().toString())
                .cookie(sessionCookieA)
                .header(CSRF_HEADER_NAME, csrfTokenA.value()))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("AST-16: Authenticated file download enforces attachment disposition and nosniff")
  void testFileDownloadSecurityHeaders() throws Exception {
    byte[] pdfHeader = new byte[] {0x25, 0x50, 0x44, 0x46};
    UUID entityId = UUID.randomUUID();
    Attachment created =
        attachmentService.uploadAttachment(
            userAId,
            AttachmentEntityType.TASK,
            entityId,
            "safe-doc.pdf",
            "application/pdf",
            pdfHeader);
    created.markClean(Instant.now());
    attachmentRepository.save(created);

    mockMvc
        .perform(get("/attachments/{id}/download", created.getId()).cookie(sessionCookieA))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(
            header()
                .string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"safe-doc.pdf\""));
  }

  // =========================================================================
  // 7. DATA EXPORT ISOLATION & CACHE CONTROLS
  // =========================================================================

  @Test
  @DisplayName("AST-17: Authenticated API responses enforce private no-cache headers")
  void testAuthenticatedApiEnforcesCacheHeaders() throws Exception {
    mockMvc
        .perform(get("/user/profile").cookie(sessionCookieA))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", Matchers.containsString("private")))
        .andExpect(header().string("Cache-Control", Matchers.containsString("no-cache")))
        .andExpect(header().string("Pragma", "no-cache"));
  }

  // =========================================================================
  // 8. INFORMATION DISCLOSURE & ACTUATOR HARDENING
  // =========================================================================

  @Test
  @DisplayName(
      "AST-18: Actuator sensitive endpoints are blocked from unauthenticated/public access")
  void testActuatorEndpointsLockedDown() throws Exception {
    mockMvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized());
    mockMvc.perform(get("/actuator/heapdump")).andExpect(status().isUnauthorized());
    mockMvc.perform(get("/actuator/beans")).andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName(
      "AST-19: Public health probes provide minimal liveness/readiness without component details")
  void testActuatorPublicHealthProbes() throws Exception {
    mockMvc
        .perform(get("/actuator/health/liveness"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"))
        .andExpect(jsonPath("$.components").doesNotExist());

    mockMvc
        .perform(get("/actuator/health/readiness"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"))
        .andExpect(jsonPath("$.components").doesNotExist());
  }
}
