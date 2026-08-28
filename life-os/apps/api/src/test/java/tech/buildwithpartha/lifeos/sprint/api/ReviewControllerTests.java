package tech.buildwithpartha.lifeos.sprint.api;

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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class ReviewControllerTests {
  private final MockMvc mockMvc;
  private final ObjectMapper mapper;
  private final UserRepository users;
  private final SessionRepository sessions;
  private final SecureTokenGenerator tokens;

  private UUID userId;
  private Cookie cookie;
  private RawToken csrf;

  @Autowired
  ReviewControllerTests(
      MockMvc mockMvc,
      ObjectMapper mapper,
      UserRepository users,
      SessionRepository sessions,
      SecureTokenGenerator tokens) {
    this.mockMvc = mockMvc;
    this.mapper = mapper;
    this.users = users;
    this.sessions = sessions;
    this.tokens = tokens;
  }

  @BeforeEach
  void setUp() {
    userId = createUser("review-owner");
    RawToken session = tokens.generate();
    csrf = tokens.generate();
    sessions.save(
        Session.issue(
            UUID.randomUUID(),
            userId,
            session.hash(),
            csrf.hash(),
            Instant.now(),
            Optional.empty()));
    cookie = new Cookie("lifeos_session", session.value());
  }

  @Test
  void requiresAuthentication() throws Exception {
    mockMvc.perform(get("/reviews")).andExpect(status().isUnauthorized());
  }

  @Test
  void fetchesPromptsAndMetrics() throws Exception {
    mockMvc
        .perform(
            get("/reviews/prompts")
                .cookie(cookie)
                .param("type", "DAILY_MORNING")
                .param("periodKey", "2026-08-25")
                .param("startDate", "2026-08-25")
                .param("endDate", "2026-08-25")
                .param("timeZone", "UTC"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.reviewType").value("DAILY_MORNING"))
        .andExpect(jsonPath("$.periodKey").value("2026-08-25"))
        .andExpect(jsonPath("$.prompts[0].promptKey").value("orient"))
        .andExpect(jsonPath("$.prompts[0].title").value("Orient"));
  }

  @Test
  void supportsDraftSaveFinalizeSkipAndReopenPolicy() throws Exception {
    String taskId = UUID.randomUUID().toString();
    // 1. Save draft with decisions and snapshot
    String draftPayload =
        String.format(
            """
            {
              "reviewType": "DAILY_MORNING",
              "periodKey": "2026-08-25",
              "startDate": "2026-08-25",
              "endDate": "2026-08-25",
              "timeZone": "UTC",
              "answers": [
                { "promptKey": "orient", "answerValue": "My day is scheduled" }
              ],
              "itemDecisions": [
                {
                  "itemType": "TASK",
                  "itemId": "%s",
                  "action": "COMPLETE",
                  "targetDate": "2026-08-26",
                  "notes": "Done"
                }
              ],
              "snapshot": {
                "tasksCompletedCount": 2,
                "tasksPlannedCount": 4,
                "tasksCarriedOverCount": 1,
                "tasksCancelledCount": 0,
                "tasksOverdueCount": 1,
                "plannedFocusMinutes": 120,
                "actualFocusMinutes": 90,
                "sprintCommittedCount": 5,
                "sprintCompletedCount": 4,
                "activeProjectCount": 3,
                "completedProjectCount": 1,
                "stalledProjectCount": 0,
                "dailyReviewCompletionCount": 2,
                "hasMissingData": true,
                "missingDataNotes": "Partial time data"
              }
            }
            """,
            taskId);

    MvcResult draftResult =
        mockMvc
            .perform(
                post("/reviews/draft")
                    .cookie(cookie)
                    .header("X-CSRF-TOKEN", csrf.value())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(draftPayload))
            .andExpect(status().isCreated())
            .andExpect(
                header()
                    .string(
                        "Location", org.hamcrest.Matchers.startsWith("/life-os/api/v1/reviews/")))
            .andExpect(jsonPath("$.status").value("DRAFT"))
            .andExpect(jsonPath("$.answers[0].promptKey").value("orient"))
            .andExpect(jsonPath("$.itemDecisions[0].itemId").value(taskId))
            .andExpect(jsonPath("$.snapshot.hasMissingData").value(true))
            .andReturn();

    JsonNode draftJson = mapper.readTree(draftResult.getResponse().getContentAsString());
    String reviewId = draftJson.get("id").asText();

    // 2. Fetch by ID
    mockMvc
        .perform(get("/reviews/" + reviewId).cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(reviewId))
        .andExpect(jsonPath("$.status").value("DRAFT"));

    // 3. List history (without type param and with invalid type param and blank type param)
    mockMvc
        .perform(get("/reviews").cookie(cookie).param("type", "DAILY_MORNING"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(reviewId));

    mockMvc
        .perform(get("/reviews").cookie(cookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(reviewId));

    mockMvc
        .perform(get("/reviews").cookie(cookie).param("type", ""))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(reviewId));

    mockMvc
        .perform(get("/reviews").cookie(cookie).param("type", "INVALID_TYPE"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(reviewId));

    // 4. Finalize review with body
    String finalizePayload =
        """
        {
          "answers": [
            { "promptKey": "orient", "answerValue": "My day is scheduled" }
          ],
          "itemDecisions": [],
          "snapshot": {
            "tasksCompletedCount": 2
          }
        }
        """;

    mockMvc
        .perform(
            post("/reviews/" + reviewId + "/finalize")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(finalizePayload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("FINALIZED"));

    // 5. Finalize again (idempotent)
    mockMvc
        .perform(
            post("/reviews/" + reviewId + "/finalize")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("FINALIZED"));

    // 6. Attempting to edit draft after finalization returns 409 Conflict
    mockMvc
        .perform(
            post("/reviews/draft")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftPayload))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("REVIEW_STATE_CONFLICT"));

    // 7. Reopen attempt returns 409 Conflict per policy
    mockMvc
        .perform(
            post("/reviews/" + reviewId + "/reopen")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value()))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("REVIEW_STATE_CONFLICT"))
        .andExpect(jsonPath("$.detail").value("Finalized reviews cannot be reopened by policy"));
  }

  @Test
  void savesMinimalDraftWithoutAnswersDecisionsOrSnapshot() throws Exception {
    String draftPayload =
        """
        {
          "reviewType": "DAILY_EVENING",
          "periodKey": "2026-08-25",
          "startDate": "2026-08-25",
          "endDate": "2026-08-25",
          "timeZone": "UTC"
        }
        """;

    mockMvc
        .perform(
            post("/reviews/draft")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftPayload))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("DRAFT"))
        .andExpect(jsonPath("$.answers").isEmpty())
        .andExpect(jsonPath("$.itemDecisions").isEmpty());
  }

  @Test
  void returnsNotFoundForMissingReview() throws Exception {
    String missingId = UUID.randomUUID().toString();
    mockMvc.perform(get("/reviews/" + missingId).cookie(cookie)).andExpect(status().isNotFound());
  }

  @Test
  void supportsSkipReview() throws Exception {
    String skipPayload =
        """
        {
          "reviewType": "DAILY_EVENING",
          "periodKey": "2026-08-25",
          "startDate": "2026-08-25",
          "endDate": "2026-08-25",
          "timeZone": "UTC",
          "reason": "Not enough time"
        }
        """;

    mockMvc
        .perform(
            post("/reviews/skip")
                .cookie(cookie)
                .header("X-CSRF-TOKEN", csrf.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(skipPayload))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("SKIPPED"))
        .andExpect(jsonPath("$.skipReason").value("Not enough time"));
  }

  private UUID createUser(String prefix) {
    return users
        .save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of(prefix + "-" + UUID.randomUUID() + "@example.test"),
                    "Review Test User",
                    Instant.now())
                .verify(Instant.now()))
        .id();
  }
}
