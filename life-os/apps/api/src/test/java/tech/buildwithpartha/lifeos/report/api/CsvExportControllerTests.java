package tech.buildwithpartha.lifeos.report.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
import org.springframework.test.web.servlet.MvcResult;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

/** Integration tests for CsvExportController endpoints (LOS-1111). */
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class CsvExportControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private Cookie sessionCookie;
  private String csrfTokenValue;

  @Autowired
  CsvExportControllerTests(
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
    userId = createAccount("csv-export-owner");
    SessionContext context = issueSession(userId);
    sessionCookie = context.sessionCookie();
    csrfTokenValue = context.csrfToken();
  }

  @Test
  void postCsvExportRequiresAuthentication() throws Exception {
    mockMvc
        .perform(
            post("/reports/export/csv")
                .param("reportType", "TASK_COMPLETION")
                .param("timeZone", "UTC"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void downloadRequiresAuthentication() throws Exception {
    mockMvc
        .perform(get("/reports/export/csv/download").param("token", "sometoken"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void generatesAndReturnsCsvExportToken() throws Exception {
    mockMvc
        .perform(
            post("/reports/export/csv")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfTokenValue)
                .param("reportType", "TASK_COMPLETION")
                .param("timeZone", "UTC"))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", containsString("no-store")))
        .andExpect(jsonPath("$.exportId", notNullValue()))
        .andExpect(jsonPath("$.fileName", containsString("task-completion")))
        .andExpect(jsonPath("$.fileName", containsString(".csv")))
        .andExpect(jsonPath("$.downloadToken", notNullValue()))
        .andExpect(jsonPath("$.tokenTtlMinutes").value(15))
        .andExpect(jsonPath("$.reportType").value("TASK_COMPLETION"));
  }

  @Test
  void downloadsCsvUsingToken() throws Exception {
    // First generate the export
    MvcResult exportResult =
        mockMvc
            .perform(
                post("/reports/export/csv")
                    .cookie(sessionCookie)
                    .header("X-CSRF-TOKEN", csrfTokenValue)
                    .param("reportType", "TIME_ALLOCATION")
                    .param("timeZone", "UTC"))
            .andExpect(status().isOk())
            .andReturn();

    String responseBody = exportResult.getResponse().getContentAsString();
    // Extract the token from the JSON response body
    String token = extractJsonField(responseBody, "downloadToken");
    String fileName = extractJsonField(responseBody, "fileName");

    assertThat(token).isNotBlank();

    // Download using the token
    MvcResult downloadResult =
        mockMvc
            .perform(
                get("/reports/export/csv/download").cookie(sessionCookie).param("token", token))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith("text/csv"))
            .andExpect(header().string("Cache-Control", containsString("no-store")))
            .andExpect(header().string("Content-Disposition", containsString("attachment")))
            .andExpect(header().string("Content-Disposition", containsString(fileName)))
            .andReturn();

    // Verify UTF-8 BOM and metadata header in CSV content
    byte[] csvBytes = downloadResult.getResponse().getContentAsByteArray();
    assertThat(csvBytes).hasSizeGreaterThan(3);
    assertThat(csvBytes[0]).isEqualTo((byte) 0xEF);
    assertThat(csvBytes[1]).isEqualTo((byte) 0xBB);
    assertThat(csvBytes[2]).isEqualTo((byte) 0xBF);

    String csvContent =
        new String(csvBytes, 3, csvBytes.length - 3, java.nio.charset.StandardCharsets.UTF_8);
    assertThat(csvContent).contains("# LifeOS Report:");
    assertThat(csvContent).contains("TIME_ALLOCATION");
  }

  @Test
  void rejectsRangeExceedingAsyncThreshold() throws Exception {
    // >90 days should be rejected for synchronous CSV
    mockMvc
        .perform(
            post("/reports/export/csv")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfTokenValue)
                .param("reportType", "TASK_COMPLETION")
                .param("startDate", "2026-01-01")
                .param("endDate", "2026-08-27")
                .param("timeZone", "UTC"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("startDate"))
        .andExpect(jsonPath("$.errors[0].code").value("RANGE_EXCEEDS_ASYNC_THRESHOLD"));
  }

  @Test
  void rejectsInvalidTimezone() throws Exception {
    mockMvc
        .perform(
            post("/reports/export/csv")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfTokenValue)
                .param("reportType", "TASK_COMPLETION")
                .param("timeZone", "Not/Valid/Zone"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("timeZone"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID_TIMEZONE"));
  }

  @Test
  void downloadReturnsFourOhFourForInvalidToken() throws Exception {
    mockMvc
        .perform(
            get("/reports/export/csv/download")
                .cookie(sessionCookie)
                .param("token", "invalidtoken0000"))
        .andExpect(status().isNotFound());
  }

  @Test
  void downloadReturnsFourOhFourForCrossUserToken() throws Exception {
    // Generate export for first user
    MvcResult exportResult =
        mockMvc
            .perform(
                post("/reports/export/csv")
                    .cookie(sessionCookie)
                    .header("X-CSRF-TOKEN", csrfTokenValue)
                    .param("reportType", "GOAL_EXECUTION")
                    .param("timeZone", "UTC"))
            .andExpect(status().isOk())
            .andReturn();

    String token =
        extractJsonField(exportResult.getResponse().getContentAsString(), "downloadToken");

    // Second user tries to download
    UUID otherUserId = createAccount("csv-cross-user");
    Cookie otherSession = issueSession(otherUserId).sessionCookie();

    mockMvc
        .perform(get("/reports/export/csv/download").cookie(otherSession).param("token", token))
        .andExpect(status().isNotFound());
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private UUID createAccount(String prefix) {
    Instant now = Instant.now();
    return userRepository
        .save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of(prefix + "-" + UUID.randomUUID() + "@example.test"),
                    "CSV Tester",
                    now)
                .verify(now))
        .id();
  }

  private record SessionContext(Cookie sessionCookie, String csrfToken) {}

  private SessionContext issueSession(UUID accountId) {
    RawToken sessionToken = tokenGenerator.generate();
    RawToken csrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            accountId,
            sessionToken.hash(),
            csrfToken.hash(),
            Instant.now(),
            Optional.empty()));
    return new SessionContext(
        new Cookie("lifeos_session", sessionToken.value()), csrfToken.value());
  }

  /**
   * Minimal JSON field extraction without pulling in a full JSON library in the test context.
   * Extracts {@code "fieldName":"value"} from a simple JSON object string.
   */
  private static String extractJsonField(String json, String fieldName) {
    String search = "\"" + fieldName + "\":\"";
    int start = json.indexOf(search);
    if (start < 0) {
      throw new IllegalArgumentException("Field not found: " + fieldName);
    }
    start += search.length();
    int end = json.indexOf('"', start);
    return json.substring(start, end);
  }
}
