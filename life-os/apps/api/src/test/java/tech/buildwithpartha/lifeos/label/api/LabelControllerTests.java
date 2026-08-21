package tech.buildwithpartha.lifeos.label.api;

import static org.assertj.core.api.Assertions.assertThat;
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
import tech.buildwithpartha.lifeos.label.domain.Label;
import tech.buildwithpartha.lifeos.label.domain.LabelRepository;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class LabelControllerTests {

  @Autowired private MockMvc mockMvc;
  @Autowired private UserRepository userRepository;
  @Autowired private SessionRepository sessionRepository;
  @Autowired private LabelRepository labelRepository;
  @Autowired private SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private Cookie sessionCookie;
  private RawToken csrfToken;
  private UUID otherUserId;
  private Cookie otherUserCookie;

  @BeforeEach
  void setUp() {
    User user =
        userRepository.save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of("labeluser-" + UUID.randomUUID() + "@example.test"),
                    "Label User",
                    Instant.now())
                .verify(Instant.now()));
    userId = user.id();

    RawToken sessionToken = tokenGenerator.generate();
    csrfToken = tokenGenerator.generate();
    Session session =
        sessionRepository.save(
            Session.issue(
                UUID.randomUUID(),
                userId,
                sessionToken.hash(),
                csrfToken.hash(),
                Instant.now(),
                Optional.empty()));
    sessionCookie = new Cookie("lifeos_session", sessionToken.value());

    User otherUser =
        userRepository.save(
            User.signup(
                    UUID.randomUUID(),
                    EmailAddress.of("otherlabeluser-" + UUID.randomUUID() + "@example.test"),
                    "Other Label User",
                    Instant.now())
                .verify(Instant.now()));
    otherUserId = otherUser.id();

    RawToken otherSessionToken = tokenGenerator.generate();
    RawToken otherCsrfToken = tokenGenerator.generate();
    Session otherSession =
        sessionRepository.save(
            Session.issue(
                UUID.randomUUID(),
                otherUserId,
                otherSessionToken.hash(),
                otherCsrfToken.hash(),
                Instant.now(),
                Optional.empty()));
    otherUserCookie = new Cookie("lifeos_session", otherSessionToken.value());
  }



  @Test
  void createLabel_validRequest_createsAndReturnsLabel() throws Exception {
    String requestJson = """
        {
          "name": "  Work Project  ",
          "color": "#FF5733"
        }
        """;

    mockMvc
        .perform(
            post("/labels")
                .cookie(sessionCookie)
                .header("X-CSRF-Token", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").exists())
        .andExpect(jsonPath("$.userId").value(userId.toString()))
        .andExpect(jsonPath("$.name").value("Work Project"))
        .andExpect(jsonPath("$.nameNormalized").value("work project"))
        .andExpect(jsonPath("$.color").value("#FF5733"))
        .andExpect(jsonPath("$.version").value(0));
  }

  @Test
  void createLabel_duplicateName_returnsBadRequest() throws Exception {
    Instant now = Instant.now();
    labelRepository.save(
        new Label(UUID.randomUUID(), userId, "Urgent", "urgent", "#FF0000", now, now, 0L));

    String requestJson = """
        {
          "name": "urgent",
          "color": "#00FF00"
        }
        """;

    mockMvc
        .perform(
            post("/labels")
                .cookie(sessionCookie)
                .header("X-CSRF-Token", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("name"))
        .andExpect(jsonPath("$.errors[0].code").value("DUPLICATE_LABEL_NAME"));
  }


  @Test
  void getLabels_returnsOnlyCurrentUsersLabels() throws Exception {
    Instant now = Instant.now();
    Label l1 =
        labelRepository.save(
            new Label(UUID.randomUUID(), userId, "Work", "work", null, now, now, 0L));
    Label l2 =
        labelRepository.save(
            new Label(UUID.randomUUID(), userId, "Home", "home", null, now, now, 0L));
    labelRepository.save(
        new Label(UUID.randomUUID(), otherUserId, "Other", "other", null, now, now, 0L));

    mockMvc
        .perform(get("/labels").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2));
  }

  @Test
  void getLabelById_returnsLabelDetail() throws Exception {
    Instant now = Instant.now();
    Label label =
        labelRepository.save(
            new Label(UUID.randomUUID(), userId, "Health", "health", "#00FF00", now, now, 0L));

    mockMvc
        .perform(get("/labels/" + label.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(label.id().toString()))
        .andExpect(jsonPath("$.name").value("Health"));
  }

  @Test
  void getLabelById_otherUsersLabel_returnsNotFound() throws Exception {
    Instant now = Instant.now();
    Label label =
        labelRepository.save(
            new Label(UUID.randomUUID(), otherUserId, "Secret", "secret", null, now, now, 0L));

    mockMvc
        .perform(get("/labels/" + label.id()).cookie(sessionCookie))
        .andExpect(status().isNotFound());
  }

  @Test
  void updateLabel_validRequest_updatesLabel() throws Exception {
    Instant now = Instant.now();
    Label label =
        labelRepository.save(
            new Label(UUID.randomUUID(), userId, "Old Title", "old title", "#000", now, now, 0L));

    String updateJson = """
        {
          "name": "New Title",
          "color": "#111",
          "version": 0
        }
        """;

    mockMvc
        .perform(
            put("/labels/" + label.id())
                .cookie(sessionCookie)
                .header("X-CSRF-Token", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateJson))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("New Title"))
        .andExpect(jsonPath("$.nameNormalized").value("new title"))
        .andExpect(jsonPath("$.color").value("#111"));
  }

  @Test
  void deleteLabel_withoutReplacement_deletesSuccessfully() throws Exception {
    Instant now = Instant.now();
    Label label =
        labelRepository.save(
            new Label(UUID.randomUUID(), userId, "Temp", "temp", null, now, now, 0L));

    mockMvc
        .perform(
            delete("/labels/" + label.id())
                .cookie(sessionCookie)
                .header("X-CSRF-Token", csrfToken.value()))
        .andExpect(status().isNoContent());

    assertThat(labelRepository.findById(label.id())).isEmpty();
  }

  @Test
  void deleteLabel_withReplacement_replacesAndDelete() throws Exception {
    Instant now = Instant.now();
    Label target =
        labelRepository.save(
            new Label(UUID.randomUUID(), userId, "Target", "target", null, now, now, 0L));
    Label replacement =
        labelRepository.save(
            new Label(UUID.randomUUID(), userId, "Replacement", "replacement", null, now, now, 0L));

    mockMvc
        .perform(
            delete("/labels/" + target.id())
                .param("replaceWithLabelId", replacement.id().toString())
                .cookie(sessionCookie)
                .header("X-CSRF-Token", csrfToken.value()))
        .andExpect(status().isNoContent());

    assertThat(labelRepository.findById(target.id())).isEmpty();
    assertThat(labelRepository.findById(replacement.id())).isPresent();
  }
}
