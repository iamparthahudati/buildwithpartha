package tech.buildwithpartha.lifeos.report.api;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class ReportControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private Cookie sessionCookie;

  @Autowired
  ReportControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
  }

  @BeforeEach
  void setUp() {
    userId = createAccount("reports-api-owner");
    sessionCookie = issueSession(userId);
  }

  @Test
  void requiresAuthentication() throws Exception {
    mockMvc.perform(get("/reports/definitions")).andExpect(status().isUnauthorized());
  }

  @Test
  void returnsListOfReportDefinitions() throws Exception {
    mockMvc
        .perform(get("/reports/definitions").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", containsString("no-store")))
        .andExpect(jsonPath("$", hasSize(6)))
        .andExpect(jsonPath("$[0].reportType").isNotEmpty())
        .andExpect(jsonPath("$[0].asyncThresholdDays").value(90));
  }

  @Test
  void returnsSingleReportDefinition() throws Exception {
    mockMvc
        .perform(get("/reports/definitions/TASK_COMPLETION").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.reportType").value("TASK_COMPLETION"))
        .andExpect(jsonPath("$.name").value("Task Completion & Productivity Report"));
  }

  @Test
  void generatesReportDataViaGenerateEndpoint() throws Exception {
    mockMvc
        .perform(
            get("/reports/generate")
                .cookie(sessionCookie)
                .param("reportType", "TASK_COMPLETION")
                .param("timeZone", "UTC"))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", containsString("no-store")))
        .andExpect(jsonPath("$.reportType").value("TASK_COMPLETION"))
        .andExpect(jsonPath("$.metricDictionaryVersion").value("1.0.0"))
        .andExpect(jsonPath("$.isAsynchronous").value(false))
        .andExpect(jsonPath("$.metrics").isNotEmpty())
        .andExpect(jsonPath("$.tables").isNotEmpty())
        .andExpect(jsonPath("$.chartSeries").isNotEmpty());
  }

  @Test
  void generatesReportDataViaNamedPathEndpoint() throws Exception {
    mockMvc
        .perform(
            get("/reports/named/TIME_ALLOCATION").cookie(sessionCookie).param("timeZone", "UTC"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.reportType").value("TIME_ALLOCATION"))
        .andExpect(jsonPath("$.metricDictionaryVersion").value("1.0.0"));
  }

  @Test
  void validatesInvalidTimezone() throws Exception {
    mockMvc
        .perform(
            get("/reports/generate")
                .cookie(sessionCookie)
                .param("reportType", "TASK_COMPLETION")
                .param("timeZone", "Invalid/Zone"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("timeZone"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID_TIMEZONE"));
  }

  @Test
  void validatesInvalidDateRange() throws Exception {
    mockMvc
        .perform(
            get("/reports/generate")
                .cookie(sessionCookie)
                .param("reportType", "TASK_COMPLETION")
                .param("startDate", "2026-08-25")
                .param("endDate", "2026-08-20")
                .param("timeZone", "UTC"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("startDate"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID_DATE_RANGE"));
  }

  @Test
  void validatesRangeExceedsMaximumBound() throws Exception {
    mockMvc
        .perform(
            get("/reports/generate")
                .cookie(sessionCookie)
                .param("reportType", "TASK_COMPLETION")
                .param("startDate", "2025-01-01")
                .param("endDate", "2026-08-25")
                .param("timeZone", "UTC"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("startDate"))
        .andExpect(jsonPath("$.errors[0].code").value("RANGE_EXCEEDS_MAXIMUM_BOUND"));
  }

  private UUID createAccount(String prefix) {
    Instant now = Instant.now();
    return userRepository
        .save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of(prefix + "-" + UUID.randomUUID() + "@example.test"),
                    "Reports Tester",
                    now)
                .verify(now))
        .id();
  }

  private Cookie issueSession(UUID accountId) {
    RawToken sessionToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            accountId,
            sessionToken.hash(),
            tokenGenerator.generate().hash(),
            Instant.now(),
            Optional.empty()));
    return new Cookie("lifeos_session", sessionToken.value());
  }
}
