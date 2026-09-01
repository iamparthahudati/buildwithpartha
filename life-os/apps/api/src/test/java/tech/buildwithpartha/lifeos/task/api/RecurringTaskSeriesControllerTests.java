package tech.buildwithpartha.lifeos.task.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.http.MediaType;
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
class RecurringTaskSeriesControllerTests {

  @Autowired private MockMvc mockMvc;
  @Autowired private UserRepository userRepository;
  @Autowired private SessionRepository sessionRepository;
  @Autowired private SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private Cookie sessionCookie;
  private RawToken csrfToken;

  @BeforeEach
  void setUp() {
    Instant now = Instant.now();
    userId = createUser("recurrence-user-", "Recurrence User", now);
    RawToken sessionToken = tokenGenerator.generate();
    csrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userId,
            sessionToken.hash(),
            csrfToken.hash(),
            now,
            Optional.empty()));
    sessionCookie = new Cookie("lifeos_session", sessionToken.value());
  }

  private UUID createUser(String prefix, String displayName, Instant now) {
    return userRepository
        .save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of(prefix + UUID.randomUUID() + "@example.test"),
                    displayName,
                    now)
                .verify(now))
        .id();
  }

  @Test
  void createsAndQueriesRecurringTaskSeries() throws Exception {
    String jsonBody =
        """
        {
          "title": "Daily Morning Planning",
          "description": "Plan key priorities for the day",
          "priority": "P2",
          "estimateMinutes": 15,
          "frequency": "DAILY",
          "intervalValue": 1,
          "endMode": "NEVER",
          "startDate": "2026-09-01",
          "timeZone": "UTC"
        }
        """;

    String response =
        mockMvc
            .perform(
                post("/tasks/recurring-series")
                    .cookie(sessionCookie)
                    .header("X-CSRF-TOKEN", csrfToken.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(jsonBody))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.title").value("Daily Morning Planning"))
            .andExpect(jsonPath("$.frequency").value("DAILY"))
            .andReturn()
            .getResponse()
            .getContentAsString();

    String seriesId = com.jayway.jsonpath.JsonPath.read(response, "$.id");

    mockMvc
        .perform(get("/tasks/recurring-series/" + seriesId).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Daily Morning Planning"));

    mockMvc
        .perform(get("/tasks/recurring-series").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].title").value("Daily Morning Planning"));

    String updateBody =
        """
        {
          "title": "Daily Morning Planning Updated",
          "priority": "P1",
          "estimateMinutes": 20,
          "frequency": "DAILY",
          "intervalValue": 1,
          "endMode": "NEVER",
          "startDate": "2026-09-01",
          "timeZone": "UTC",
          "scope": "SERIES"
        }
        """;

    mockMvc
        .perform(
            put("/tasks/recurring-series/" + seriesId)
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Daily Morning Planning Updated"))
        .andExpect(jsonPath("$.priority").value("P1"));

    mockMvc
        .perform(
            delete("/tasks/recurring-series/" + seriesId)
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNoContent());
  }

  @Test
  void skipsOccurrenceAndRecordsException() throws Exception {
    String jsonBody =
        """
        {
          "title": "Weekly Review",
          "priority": "P1",
          "estimateMinutes": 30,
          "frequency": "WEEKLY",
          "intervalValue": 1,
          "daysOfWeek": "FRIDAY",
          "endMode": "NEVER",
          "startDate": "2026-09-01",
          "timeZone": "UTC"
        }
        """;

    String response =
        mockMvc
            .perform(
                post("/tasks/recurring-series")
                    .cookie(sessionCookie)
                    .header("X-CSRF-TOKEN", csrfToken.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(jsonBody))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();

    String seriesId = com.jayway.jsonpath.JsonPath.read(response, "$.id");

    String skipBody =
        """
        {
          "occurrenceDate": "2026-09-04",
          "reason": "Holiday"
        }
        """;

    mockMvc
        .perform(
            post("/tasks/recurring-series/" + seriesId + "/skip")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(skipBody))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/tasks/recurring-series/" + seriesId + "/exceptions").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].occurrenceDate").value("2026-09-04"))
        .andExpect(jsonPath("$[0].exceptionType").value("SKIPPED"));
  }
}
