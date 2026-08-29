package tech.buildwithpartha.lifeos.timeblock.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockDomainFixture;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class TimeBlockControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final TimeBlockRepository timeBlockRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private UUID otherUserId;
  private RawToken sessionToken;
  private RawToken csrfToken;
  private Cookie sessionCookie;

  @Autowired
  TimeBlockControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      TimeBlockRepository timeBlockRepository,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.timeBlockRepository = timeBlockRepository;
    this.tokenGenerator = tokenGenerator;
  }

  @BeforeEach
  void setUp() {
    userId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("tb-test-" + UUID.randomUUID() + "@example.test"),
                        "TimeBlock Tester",
                        Instant.now())
                    .verify(Instant.now()))
            .id();

    otherUserId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("tb-other-" + UUID.randomUUID() + "@example.test"),
                        "TimeBlock Other",
                        Instant.now())
                    .verify(Instant.now()))
            .id();

    sessionToken = tokenGenerator.generate();
    csrfToken = tokenGenerator.generate();
    sessionRepository.save(
        Session.issue(
            UUID.randomUUID(),
            userId,
            sessionToken.hash(),
            csrfToken.hash(),
            Instant.now(),
            Optional.empty()));

    sessionCookie = new Cookie("lifeos_session", sessionToken.value());
  }

  @Test
  @DisplayName("POST /time-blocks creates a time block successfully")
  void createTimeBlockSuccess() throws Exception {
    String body =
        """
        {
          "title": "Deep Focus",
          "category": "WORK",
          "status": "SCHEDULED",
          "startAt": "2026-08-24T09:00:00Z",
          "endAt": "2026-08-24T10:30:00Z",
          "sourceTimeZone": "UTC",
          "notes": "Work on LOS-0902"
        }
        """;

    mockMvc
        .perform(
            post("/time-blocks")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").exists())
        .andExpect(jsonPath("$.title").value("Deep Focus"))
        .andExpect(jsonPath("$.category").value("WORK"))
        .andExpect(jsonPath("$.status").value("SCHEDULED"))
        .andExpect(jsonPath("$.durationMinutes").value(90));
  }

  @Test
  @DisplayName("POST /time-blocks returns 409 Conflict when overlap exists")
  void createTimeBlockConflict() throws Exception {
    TimeBlock existing =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(userId)
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .build();
    timeBlockRepository.save(existing);

    String body =
        """
        {
          "title": "Conflicting Block",
          "category": "WORK",
          "startAt": "2026-08-24T09:30:00Z",
          "endAt": "2026-08-24T10:30:00Z",
          "sourceTimeZone": "UTC"
        }
        """;

    mockMvc
        .perform(
            post("/time-blocks")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("TIME_BLOCK_OVERLAP_CONFLICT"));
  }

  @Test
  @DisplayName("POST /time-blocks permits overlap when allowOverlap is true")
  void createTimeBlockAllowedOverlap() throws Exception {
    TimeBlock existing =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(userId)
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .build();
    timeBlockRepository.save(existing);

    String body =
        """
        {
          "title": "Allowed Overlap",
          "category": "WORK",
          "startAt": "2026-08-24T09:30:00Z",
          "endAt": "2026-08-24T10:30:00Z",
          "sourceTimeZone": "UTC",
          "allowOverlap": true
        }
        """;

    mockMvc
        .perform(
            post("/time-blocks")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.title").value("Allowed Overlap"));
  }

  @Test
  @DisplayName("GET /time-blocks queries user time blocks")
  void queryTimeBlocksSuccess() throws Exception {
    TimeBlock block =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(userId)
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .build();
    timeBlockRepository.save(block);

    mockMvc
        .perform(
            get("/time-blocks")
                .cookie(sessionCookie)
                .param("date", "2026-08-24")
                .param("timeZone", "UTC"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalCount").value(1))
        .andExpect(jsonPath("$.timeBlocks[0].id").value(block.id().toString()));
  }

  @Test
  @DisplayName("GET /time-blocks/{id} returns 404 for other user's time block")
  void getTimeBlockCrossUserForbidden() throws Exception {
    TimeBlock otherUserBlock = TimeBlockDomainFixture.aTimeBlock().withUserId(otherUserId).build();
    timeBlockRepository.save(otherUserBlock);

    mockMvc
        .perform(get("/time-blocks/" + otherUserBlock.id()).cookie(sessionCookie))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("PUT /time-blocks/{id} updates time block attributes")
  void updateTimeBlockSuccess() throws Exception {
    TimeBlock block =
        TimeBlockDomainFixture.aTimeBlock().withUserId(userId).withVersion(0L).build();
    TimeBlock saved = timeBlockRepository.save(block);

    String body =
        """
        {
          "title": "Updated Title",
          "category": "LEARNING",
          "status": "IN_PROGRESS",
          "startAt": "2026-08-24T09:00:00Z",
          "endAt": "2026-08-24T10:30:00Z",
          "sourceTimeZone": "UTC",
          "version": %d
        }
        """
            .formatted(saved.version());

    mockMvc
        .perform(
            put("/time-blocks/" + saved.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Updated Title"))
        .andExpect(jsonPath("$.category").value("LEARNING"))
        .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
  }

  @Test
  @DisplayName("PATCH /time-blocks/{id}/move moves start and end times")
  void moveTimeBlockSuccess() throws Exception {
    TimeBlock block =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(userId)
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .build();
    TimeBlock saved = timeBlockRepository.save(block);

    String body =
        """
        {
          "startAt": "2026-08-24T11:00:00Z",
          "endAt": "2026-08-24T12:00:00Z",
          "version": %d
        }
        """
            .formatted(saved.version());

    mockMvc
        .perform(
            patch("/time-blocks/" + saved.id() + "/move")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.startAt").value("2026-08-24T11:00:00Z"))
        .andExpect(jsonPath("$.endAt").value("2026-08-24T12:00:00Z"));
  }

  @Test
  @DisplayName("PATCH /time-blocks/{id}/resize resizes time block duration")
  void resizeTimeBlockSuccess() throws Exception {
    TimeBlock block =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(userId)
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .build();
    TimeBlock saved = timeBlockRepository.save(block);

    String body =
        """
        {
          "startAt": "2026-08-24T09:00:00Z",
          "endAt": "2026-08-24T10:45:00Z",
          "version": %d
        }
        """
            .formatted(saved.version());

    mockMvc
        .perform(
            patch("/time-blocks/" + saved.id() + "/resize")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.durationMinutes").value(105));
  }

  @Test
  @DisplayName("POST /time-blocks/{id}/complete marks block as COMPLETED")
  void completeTimeBlockSuccess() throws Exception {
    TimeBlock block = TimeBlockDomainFixture.aTimeBlock().withUserId(userId).build();
    TimeBlock saved = timeBlockRepository.save(block);

    mockMvc
        .perform(
            post("/time-blocks/" + saved.id() + "/complete")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("COMPLETED"));
  }

  @Test
  @DisplayName("POST /time-blocks/{id}/duplicate creates a duplicated time block")
  void duplicateTimeBlockSuccess() throws Exception {
    TimeBlock block =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(userId)
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .build();
    TimeBlock saved = timeBlockRepository.save(block);

    String body =
        """
        {
          "startAt": "2026-08-24T14:00:00Z",
          "endAt": "2026-08-24T15:00:00Z"
        }
        """;

    mockMvc
        .perform(
            post("/time-blocks/" + saved.id() + "/duplicate")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").exists())
        .andExpect(jsonPath("$.title").value(saved.title()))
        .andExpect(jsonPath("$.startAt").value("2026-08-24T14:00:00Z"));
  }

  @Test
  @DisplayName("DELETE /time-blocks/{id} deletes time block")
  void deleteTimeBlockSuccess() throws Exception {
    TimeBlock block = TimeBlockDomainFixture.aTimeBlock().withUserId(userId).build();
    TimeBlock saved = timeBlockRepository.save(block);

    mockMvc
        .perform(
            delete("/time-blocks/" + saved.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/time-blocks/" + saved.id()).cookie(sessionCookie))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("POST /time-blocks/check-overlap returns conflict preflight status")
  void checkOverlapSuccess() throws Exception {
    TimeBlock block =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(userId)
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .build();
    timeBlockRepository.save(block);

    String body =
        """
        {
          "startAt": "2026-08-24T09:30:00Z",
          "endAt": "2026-08-24T10:30:00Z"
        }
        """;

    mockMvc
        .perform(
            post("/time-blocks/check-overlap")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.hasConflict").value(true))
        .andExpect(jsonPath("$.conflictingBlocks").isArray())
        .andExpect(jsonPath("$.conflictingBlocks[0].id").value(block.id().toString()));
  }
}
