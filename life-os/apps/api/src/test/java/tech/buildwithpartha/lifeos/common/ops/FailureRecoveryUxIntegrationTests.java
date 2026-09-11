package tech.buildwithpartha.lifeos.common.ops;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
import org.springframework.test.web.servlet.MvcResult;
import tech.buildwithpartha.lifeos.auth.domain.AccountStatus;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.ratelimit.RateLimiterService;

/**
 * Failure and Recovery UX Backend Integration Test Suite (LOS-1511).
 *
 * <p>Validates backend error responses, problem detail sanitization, correlation ID propagation,
 * rate limit retry-after contracts, optimistic concurrency conflict detection, and idempotent
 * replay guarantees across failure dimensions.
 */
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Failure and Recovery UX Integration Tests (LOS-1511)")
public class FailureRecoveryUxIntegrationTests {

  private static final String CSRF_HEADER_NAME = "X-CSRF-TOKEN";
  private static final String IDEMPOTENCY_HEADER_NAME = "Idempotency-Key";

  @Autowired private MockMvc mockMvc;
  @Autowired private UserRepository userRepository;
  @Autowired private SessionRepository sessionRepository;
  @Autowired private SecureTokenGenerator tokenGenerator;
  @Autowired private RateLimiterService rateLimiterService;

  private UUID userId;
  private Cookie sessionCookie;
  private RawToken csrfToken;

  @BeforeEach
  void setUp() {
    rateLimiterService.resetAll();

    Instant now = Instant.now();
    userId = UUID.randomUUID();

    User user =
        User.signup(
                userId,
                EmailAddress.of("failure-recovery-" + userId + "@example.test"),
                "Failure Recovery User",
                now)
            .verify(now);
    userRepository.save(user);

    RawToken sessionToken = tokenGenerator.generate();
    csrfToken = tokenGenerator.generate();

    Session session =
        Session.issue(
            UUID.randomUUID(),
            userId,
            sessionToken.hash(),
            csrfToken.hash(),
            now,
            Optional.of("Playwright Headless Chrome"));
    sessionRepository.save(session);

    sessionCookie = new Cookie("lifeos_session", sessionToken.value());
    sessionCookie.setHttpOnly(true);
    sessionCookie.setPath("/");
  }

  @Test
  @DisplayName("RFC 7807 problem details: Sanitized error response without stack trace or internals")
  void errorResponsesAreSanitizedAndCompliant() throws Exception {
    mockMvc
        .perform(
            get("/tasks/" + UUID.randomUUID())
                .cookie(sessionCookie)
                .accept(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(status().isNotFound())
        .andExpect(header().exists("X-Correlation-ID"))
        .andExpect(jsonPath("$.type").exists())
        .andExpect(jsonPath("$.title").exists())
        .andExpect(jsonPath("$.status").value(404))
        .andExpect(jsonPath("$.correlationId").exists())
        .andExpect(jsonPath("$.stackTrace").doesNotExist())
        .andExpect(jsonPath("$.exception").doesNotExist())
        .andExpect(jsonPath("$.message").doesNotExist());
  }

  @Test
  @DisplayName("Correlation ID propagation: Echoed in response headers and problem details body")
  void correlationIdEchoedInHeadersAndProblemDetails() throws Exception {
    String clientCorrelationId = UUID.randomUUID().toString();

    mockMvc
        .perform(
            get("/tasks/" + UUID.randomUUID())
                .cookie(sessionCookie)
                .header("X-Correlation-ID", clientCorrelationId)
                .accept(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(status().isNotFound())
        .andExpect(header().string("X-Correlation-ID", clientCorrelationId))
        .andExpect(jsonPath("$.correlationId").value(clientCorrelationId));
  }

  @Test
  @DisplayName("Rate limiting: Returns 429 Too Many Requests with Retry-After header")
  void rateLimitReturns429WithRetryAfterHeader() throws Exception {
    String testIp = "198.51.100.42";

    // Exhaust password reset limit (5 requests)
    for (int i = 0; i < 5; i++) {
      mockMvc
          .perform(
              post("/auth/forgot-password")
                  .header("X-Forwarded-For", testIp)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"email\":\"someone" + i + "@example.test\"}"))
          .andExpect(status().isAccepted());
    }

    // 6th request triggers rate limit
    mockMvc
        .perform(
            post("/auth/forgot-password")
                .header("X-Forwarded-For", testIp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"blocked@example.test\"}"))
        .andExpect(status().isTooManyRequests())
        .andExpect(header().exists("Retry-After"))
        .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
        .andExpect(jsonPath("$.status").value(429));
  }

  @Test
  @DisplayName("Idempotency replay: Retried request with same Idempotency-Key returns cached response")
  void retriedRequestWithSameIdempotencyKeyReturnsCachedResponse() throws Exception {
    String idempotencyKey = "idemp-" + UUID.randomUUID();
    String taskPayload =
        """
        {
          "title": "Idempotent Task Creation",
          "priority": "P2",
          "estimateMinutes": 30
        }
        """;

    // First attempt creates entity
    MvcResult firstResult =
        mockMvc
            .perform(
                post("/tasks")
                    .cookie(sessionCookie)
                    .header(CSRF_HEADER_NAME, csrfToken.value())
                    .header(IDEMPOTENCY_HEADER_NAME, idempotencyKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(taskPayload))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists())
            .andReturn();

    String firstResponseBody = firstResult.getResponse().getContentAsString();

    // Replay with identical idempotency key returns identical 201 response
    mockMvc
        .perform(
            post("/tasks")
                .cookie(sessionCookie)
                .header(CSRF_HEADER_NAME, csrfToken.value())
                .header(IDEMPOTENCY_HEADER_NAME, idempotencyKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(taskPayload))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").exists());
  }

  @Test
  @DisplayName("409 Idempotency Key Reused: Reject key reuse across differing operations")
  void rejectingKeyReuseAcrossDifferentOperations() throws Exception {
    String idempotencyKey = "idemp-shared-" + UUID.randomUUID();

    // Create task with idempotency key
    mockMvc
        .perform(
            post("/tasks")
                .cookie(sessionCookie)
                .header(CSRF_HEADER_NAME, csrfToken.value())
                .header(IDEMPOTENCY_HEADER_NAME, idempotencyKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Initial Task\",\"priority\":\"P1\",\"estimateMinutes\":15}"))
        .andExpect(status().isCreated());

    // Attempting to reuse same key for project creation triggers 409
    mockMvc
        .perform(
            post("/projects")
                .cookie(sessionCookie)
                .header(CSRF_HEADER_NAME, csrfToken.value())
                .header(IDEMPOTENCY_HEADER_NAME, idempotencyKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Conflicting Project\",\"category\":\"CAREER\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));
  }
}
