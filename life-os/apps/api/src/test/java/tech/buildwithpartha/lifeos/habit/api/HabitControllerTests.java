package tech.buildwithpartha.lifeos.habit.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntryRepository;
import tech.buildwithpartha.lifeos.habit.domain.HabitRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("HabitController integration tests")
class HabitControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final HabitRepository habitRepository;
  private final HabitEntryRepository habitEntryRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final ObjectMapper objectMapper;

  private UUID userId;
  private Cookie sessionCookie;
  private RawToken csrfToken;

  private Cookie otherSessionCookie;
  private RawToken otherCsrfToken;

  @Autowired
  HabitControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      HabitRepository habitRepository,
      HabitEntryRepository habitEntryRepository,
      SecureTokenGenerator tokenGenerator,
      ObjectMapper objectMapper) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.habitRepository = habitRepository;
    this.habitEntryRepository = habitEntryRepository;
    this.tokenGenerator = tokenGenerator;
    this.objectMapper = objectMapper;
  }

  @BeforeEach
  void setUp() {
    userId = createUser("user-a-" + UUID.randomUUID());
    RawToken sessionTokenA = tokenGenerator.generate();
    csrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userId,
            sessionTokenA.hash(),
            csrfToken.hash(),
            Instant.now(),
            Optional.empty()));
    sessionCookie = new Cookie("lifeos_session", sessionTokenA.value());

    UUID otherUserId = createUser("user-b-" + UUID.randomUUID());
    RawToken sessionTokenB = tokenGenerator.generate();
    otherCsrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            otherUserId,
            sessionTokenB.hash(),
            otherCsrfToken.hash(),
            Instant.now(),
            Optional.empty()));
    otherSessionCookie = new Cookie("lifeos_session", sessionTokenB.value());
  }

  private UUID createUser(String prefix) {
    return userRepository
        .save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of(prefix + "@example.test"),
                    prefix,
                    Instant.now())
                .verify(Instant.now()))
        .id();
  }

  private UUID createHabit(String body) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/habits")
                    .cookie(sessionCookie)
                    .header("X-CSRF-TOKEN", csrfToken.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
            .andExpect(status().isCreated())
            .andReturn();
    JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
    return UUID.fromString(node.get("id").asText());
  }

  private static final String DAILY_WATER =
      """
      {
        "name": "Drink water",
        "description": "Eight glasses",
        "cadence": "DAILY",
        "targetCount": 8,
        "timeZone": "America/New_York",
        "color": "#3366FF",
        "reminderEnabled": true,
        "reminderTime": "09:00:00"
      }
      """;

  @Test
  @DisplayName("POST /habits creates a habit and returns 201 with Location")
  void createHabit() throws Exception {
    mockMvc
        .perform(
            post("/habits")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(DAILY_WATER))
        .andExpect(status().isCreated())
        .andExpect(header().exists("Location"))
        .andExpect(jsonPath("$.name").value("Drink water"))
        .andExpect(jsonPath("$.cadence").value("DAILY"))
        .andExpect(jsonPath("$.targetCount").value(8))
        .andExpect(jsonPath("$.reminderEnabled").value(true))
        .andExpect(jsonPath("$.archived").value(false))
        .andExpect(jsonPath("$.version").value(0));
  }

  @Test
  @DisplayName("POST /habits rejects an unknown cadence with 400 VALIDATION_FAILED")
  void createHabitInvalidCadence() throws Exception {
    String body =
        """
        {
          "name": "X",
          "cadence": "HOURLY",
          "targetCount": 1,
          "timeZone": "UTC",
          "reminderEnabled": false
        }
        """;
    mockMvc
        .perform(
            post("/habits")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("cadence"));
  }

  @Test
  @DisplayName("POST /habits rejects reminder enabled without a time")
  void createHabitReminderWithoutTime() throws Exception {
    String body =
        """
        {
          "name": "X",
          "cadence": "DAILY",
          "targetCount": 1,
          "timeZone": "UTC",
          "reminderEnabled": true
        }
        """;
    mockMvc
        .perform(
            post("/habits")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("reminderTime"));
  }

  @Test
  @DisplayName("POST /habits rejects a non-positive target count")
  void createHabitInvalidTarget() throws Exception {
    String body =
        """
        {
          "name": "X",
          "cadence": "DAILY",
          "targetCount": 0,
          "timeZone": "UTC",
          "reminderEnabled": false
        }
        """;
    mockMvc
        .perform(
            post("/habits")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("targetCount"));
  }

  @Test
  @DisplayName("GET /habits/{id} for another user's habit returns 404")
  void getHabitCrossUser() throws Exception {
    UUID habitId = createHabit(DAILY_WATER);

    mockMvc
        .perform(get("/habits/" + habitId).cookie(otherSessionCookie))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
  }

  @Test
  @DisplayName("GET /habits lists the user's habits and filters by archived")
  void listHabits() throws Exception {
    createHabit(DAILY_WATER);

    mockMvc
        .perform(get("/habits").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1));

    mockMvc
        .perform(get("/habits").param("archived", "true").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  @DisplayName("PUT /habits/{id} updates details; a stale version returns 409")
  void updateHabit() throws Exception {
    UUID habitId = createHabit(DAILY_WATER);

    String update =
        """
        {
          "name": "Hydrate",
          "cadence": "DAILY",
          "targetCount": 10,
          "timeZone": "America/New_York",
          "reminderEnabled": false,
          "version": 0
        }
        """;
    mockMvc
        .perform(
            put("/habits/" + habitId)
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(update))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Hydrate"))
        .andExpect(jsonPath("$.targetCount").value(10))
        .andExpect(jsonPath("$.version").value(1));

    String staleUpdate =
        """
        {
          "name": "Stale",
          "cadence": "DAILY",
          "targetCount": 1,
          "timeZone": "America/New_York",
          "reminderEnabled": false,
          "version": 0
        }
        """;
    mockMvc
        .perform(
            put("/habits/" + habitId)
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(staleUpdate))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CONCURRENCY_CONFLICT"));
  }

  @Test
  @DisplayName("Archive then restore flips the archived flag")
  void archiveRestore() throws Exception {
    UUID habitId = createHabit(DAILY_WATER);

    mockMvc
        .perform(
            post("/habits/" + habitId + "/archive")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\": 0}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archived").value(true));

    mockMvc
        .perform(
            post("/habits/" + habitId + "/archive")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\": 1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archived").value(true))
        .andExpect(jsonPath("$.version").value(1));

    mockMvc
        .perform(
            post("/habits/" + habitId + "/restore")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\": 1}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archived").value(false));
  }

  @Test
  @DisplayName("Incrementing twice reuses one local-date entry and sums the count")
  void incrementReusesDailyEntry() throws Exception {
    UUID habitId = createHabit(DAILY_WATER);

    mockMvc
        .perform(
            post("/habits/" + habitId + "/entries/increment")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.completedCount").value(1));

    mockMvc
        .perform(
            post("/habits/" + habitId + "/entries/increment")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"by\": 3}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.completedCount").value(4));

    mockMvc
        .perform(get("/habits/" + habitId + "/entries/today").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].completedCount").value(4));
  }

  @Test
  @DisplayName("Set then remove an explicit-date entry")
  void setAndRemoveEntry() throws Exception {
    UUID habitId = createHabit(DAILY_WATER);

    mockMvc
        .perform(
            put("/habits/" + habitId + "/entries")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"count\": 5, \"date\": \"2026-02-10\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.completedCount").value(5))
        .andExpect(jsonPath("$.localDate").value("2026-02-10"));

    mockMvc
        .perform(
            get("/habits/" + habitId + "/entries")
                .param("from", "2026-02-01")
                .param("to", "2026-02-28")
                .cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1));

    mockMvc
        .perform(
            delete("/habits/" + habitId + "/entries")
                .param("date", "2026-02-10")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            delete("/habits/" + habitId + "/entries")
                .param("date", "2026-02-10")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            get("/habits/" + habitId + "/entries")
                .param("from", "2026-02-01")
                .param("to", "2026-02-28")
                .cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  @DisplayName("GET /habits/{id}/stats aggregates completions over a window")
  void stats() throws Exception {
    UUID habitId = createHabit(DAILY_WATER);

    mockMvc.perform(
        put("/habits/" + habitId + "/entries")
            .cookie(sessionCookie)
            .header("X-CSRF-TOKEN", csrfToken.value())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"count\": 8, \"date\": \"2026-02-02\"}"));
    mockMvc.perform(
        put("/habits/" + habitId + "/entries")
            .cookie(sessionCookie)
            .header("X-CSRF-TOKEN", csrfToken.value())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"count\": 4, \"date\": \"2026-02-04\"}"));

    mockMvc
        .perform(
            get("/habits/" + habitId + "/stats")
                .param("from", "2026-02-01")
                .param("to", "2026-02-05")
                .cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalDays").value(5))
        .andExpect(jsonPath("$.daysWithEntry").value(2))
        .andExpect(jsonPath("$.daysMeetingTarget").value(1))
        .andExpect(jsonPath("$.totalCompletions").value(12))
        .andExpect(jsonPath("$.currentStreak").value(0))
        .andExpect(jsonPath("$.longestStreak").value(1))
        .andExpect(jsonPath("$.eligiblePeriods").value(5))
        .andExpect(jsonPath("$.metTargetPeriods").value(1))
        .andExpect(jsonPath("$.cadenceCompletionRate").value(0.2));
  }

  @Test
  @DisplayName("Entry ranges reject more than 366 local dates")
  void entryRangeIsBounded() throws Exception {
    UUID habitId = createHabit(DAILY_WATER);

    mockMvc
        .perform(
            get("/habits/" + habitId + "/entries")
                .param("from", "2025-01-01")
                .param("to", "2026-01-02")
                .cookie(sessionCookie))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].code").value("RANGE_TOO_LARGE"));
  }

  @Test
  @DisplayName("Another user cannot mutate a habit entry")
  void entryMutationIsOwnerScoped() throws Exception {
    UUID habitId = createHabit(DAILY_WATER);

    mockMvc
        .perform(
            put("/habits/" + habitId + "/entries")
                .cookie(otherSessionCookie)
                .header("X-CSRF-TOKEN", otherCsrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"count\": 1, \"date\": \"2026-02-10\"}"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
  }

  @Test
  @DisplayName("Habit writes require authentication and CSRF protection")
  void writesRequireAuthenticationAndCsrf() throws Exception {
    mockMvc
        .perform(post("/habits").contentType(MediaType.APPLICATION_JSON).content(DAILY_WATER))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/habits")
                .cookie(sessionCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(DAILY_WATER))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Pause periods can be opened, listed, and removed")
  void pausePeriods() throws Exception {
    UUID habitId = createHabit(DAILY_WATER);

    MvcResult created =
        mockMvc
            .perform(
                post("/habits/" + habitId + "/pauses")
                    .cookie(sessionCookie)
                    .header("X-CSRF-TOKEN", csrfToken.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"startDate\": \"2026-03-01\", \"endDate\": \"2026-03-10\", \"reason\":"
                            + " \"Vacation\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.startDate").value("2026-03-01"))
            .andReturn();
    UUID pauseId =
        UUID.fromString(
            objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText());

    mockMvc
        .perform(get("/habits/" + habitId + "/pauses").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1));

    mockMvc
        .perform(
            delete("/habits/" + habitId + "/pauses/" + pauseId)
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNoContent());
  }

  @Test
  @DisplayName("POST /habits/{id}/pauses rejects an end date before the start date")
  void pauseInvalidRange() throws Exception {
    UUID habitId = createHabit(DAILY_WATER);

    mockMvc
        .perform(
            post("/habits/" + habitId + "/pauses")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"startDate\": \"2026-03-10\", \"endDate\": \"2026-03-01\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("endDate"));
  }

  @Test
  @DisplayName("DELETE /habits/{id} removes the habit and cascades its entries")
  void deleteCascades() throws Exception {
    UUID habitId = createHabit(DAILY_WATER);
    mockMvc.perform(
        put("/habits/" + habitId + "/entries")
            .cookie(sessionCookie)
            .header("X-CSRF-TOKEN", csrfToken.value())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"count\": 2, \"date\": \"2026-02-10\"}"));

    mockMvc
        .perform(
            delete("/habits/" + habitId)
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNoContent());

    assertThat(habitRepository.findByIdAndUserId(habitId, userId)).isEmpty();
    assertThat(habitEntryRepository.findByHabitId(habitId)).isEmpty();
  }
}
