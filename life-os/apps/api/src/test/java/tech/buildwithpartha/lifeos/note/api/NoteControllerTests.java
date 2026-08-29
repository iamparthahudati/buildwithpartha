package tech.buildwithpartha.lifeos.note.api;

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
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
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
import tech.buildwithpartha.lifeos.goal.domain.GoalRepository;
import tech.buildwithpartha.lifeos.label.domain.Label;
import tech.buildwithpartha.lifeos.label.domain.LabelRepository;
import tech.buildwithpartha.lifeos.note.application.CreateNoteCommand;
import tech.buildwithpartha.lifeos.note.application.UpdateNoteCommand;
import tech.buildwithpartha.lifeos.note.domain.Note;
import tech.buildwithpartha.lifeos.note.domain.NoteQuery;
import tech.buildwithpartha.lifeos.note.domain.NoteRepository;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("NoteController integration tests")
class NoteControllerTests {

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final NoteRepository noteRepository;
  private final LabelRepository labelRepository;
  private final ProjectRepository projectRepository;
  private final TaskRepository taskRepository;
  private final GoalRepository goalRepository;
  private final SecureTokenGenerator tokenGenerator;

  private UUID userId;
  private Cookie sessionCookie;
  private RawToken csrfToken;

  private UUID otherUserId;
  private Cookie otherSessionCookie;
  private RawToken otherCsrfToken;

  @Autowired
  NoteControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      NoteRepository noteRepository,
      LabelRepository labelRepository,
      ProjectRepository projectRepository,
      TaskRepository taskRepository,
      GoalRepository goalRepository,
      SecureTokenGenerator tokenGenerator) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.noteRepository = noteRepository;
    this.labelRepository = labelRepository;
    this.projectRepository = projectRepository;
    this.taskRepository = taskRepository;
    this.goalRepository = goalRepository;
    this.tokenGenerator = tokenGenerator;
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

    otherUserId = createUser("user-b-" + UUID.randomUUID());
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

  @Test
  @DisplayName("POST /notes creates a note successfully and returns 210 Created")
  void createNote() throws Exception {
    Label label =
        labelRepository.save(
            new Label(
                UUID.randomUUID(),
                userId,
                "personal",
                "personal",
                "#ffffff",
                Instant.now(),
                Instant.now(),
                0L));

    String json =
        String.format(
            """
            {
              "title": "Meeting notes",
              "body": "Discuss project updates",
              "labelIds": ["%s"],
              "links": []
            }
            """,
            label.id());

    mockMvc
        .perform(
            post("/notes")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
        .andExpect(status().isCreated())
        .andExpect(header().exists("Location"))
        .andExpect(jsonPath("$.title").value("Meeting notes"))
        .andExpect(jsonPath("$.body").value("Discuss project updates"))
        .andExpect(jsonPath("$.labelIds[0]").value(label.id().toString()))
        .andExpect(jsonPath("$.pinned").value(false))
        .andExpect(jsonPath("$.archived").value(false));
  }

  @Test
  @DisplayName("POST /notes rejects blank titles with 400 Bad Request")
  void createNoteBlankTitle() throws Exception {
    String json =
        """
        {
          "title": "  ",
          "body": "Some body",
          "labelIds": [],
          "links": []
        }
        """;

    mockMvc
        .perform(
            post("/notes")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
  }

  @Test
  @DisplayName("POST /notes rejects invalid labels with 400 Bad Request")
  void createNoteInvalidLabel() throws Exception {
    // Label belongs to other user
    Label otherLabel =
        labelRepository.save(
            new Label(
                UUID.randomUUID(),
                otherUserId,
                "work",
                "work",
                "#000000",
                Instant.now(),
                Instant.now(),
                0L));

    String json =
        String.format(
            """
            {
              "title": "Note title",
              "body": "Body content",
              "labelIds": ["%s"],
              "links": []
            }
            """,
            otherLabel.id());

    mockMvc
        .perform(
            post("/notes")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.errors[0].field").value("labelIds"))
        .andExpect(jsonPath("$.errors[0].code").value("INVALID_LABEL"));
  }

  @Test
  @DisplayName("POST /notes rejects invalid target links with 404 Not Found")
  void createNoteInvalidLink() throws Exception {
    // Project belongs to other user
    Project project =
        projectRepository.save(
            new Project(
                UUID.randomUUID(),
                otherUserId,
                "Other Project",
                Optional.empty(),
                ProjectStatus.ACTIVE,
                ProjectPriority.P2,
                ProjectHealth.ON_TRACK,
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Instant.now(),
                Instant.now(),
                Collections.emptySet(),
                0L));

    String json =
        String.format(
            """
            {
              "title": "Note title",
              "body": "Body content",
              "labelIds": [],
              "links": [
                {
                  "targetType": "PROJECT",
                  "targetId": "%s"
                }
              ]
            }
            """,
            project.id());

    mockMvc
        .perform(
            post("/notes")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("GET /notes/{id} returns note details for owner, 404 for cross-user")
  void getNoteIsolation() throws Exception {
    Note note =
        noteRepository.save(
            new Note(
                UUID.randomUUID(),
                userId,
                "My Note",
                "Secret content",
                false,
                false,
                Instant.now(),
                Instant.now(),
                Set.of(),
                List.of(),
                0L));

    mockMvc
        .perform(get("/notes/" + note.id()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("My Note"));

    mockMvc
        .perform(get("/notes/" + note.id()).cookie(otherSessionCookie))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("PUT /notes/{id} updates note successfully and validates version")
  void updateNote() throws Exception {
    Note note =
        noteRepository.save(
            new Note(
                UUID.randomUUID(),
                userId,
                "Initial Title",
                "Initial body",
                false,
                false,
                Instant.now(),
                Instant.now(),
                Set.of(),
                List.of(),
                0L));

    String json =
        String.format(
            """
            {
              "title": "Updated Title",
              "body": "Updated body",
              "labelIds": [],
              "links": [],
              "version": %d
            }
            """,
            note.version());

    mockMvc
        .perform(
            put("/notes/" + note.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Updated Title"))
        .andExpect(jsonPath("$.body").value("Updated body"))
        .andExpect(jsonPath("$.version").value(1));

    // Stale version updates must throw 409 Conflict
    mockMvc
        .perform(
            put("/notes/" + note.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
        .andExpect(status().isConflict());
  }

  @Test
  @DisplayName("DELETE /notes/{id} deletes note successfully")
  void deleteNote() throws Exception {
    Note note =
        noteRepository.save(
            new Note(
                UUID.randomUUID(),
                userId,
                "ToDelete",
                "content",
                false,
                false,
                Instant.now(),
                Instant.now(),
                Set.of(),
                List.of(),
                0L));

    mockMvc
        .perform(
            delete("/notes/" + note.id())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/notes/" + note.id()).cookie(sessionCookie))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("POST /notes/{id}/pin and unpin manage pinned state and concurrency")
  void pinAndUnpinNote() throws Exception {
    Note note =
        noteRepository.save(
            new Note(
                UUID.randomUUID(),
                userId,
                "ToPin",
                "content",
                false,
                false,
                Instant.now(),
                Instant.now(),
                Set.of(),
                List.of(),
                0L));

    String pinJson = String.format("{\"version\": %d}", note.version());
    mockMvc
        .perform(
            post("/notes/" + note.id() + "/pin")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pinJson))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pinned").value(true))
        .andExpect(jsonPath("$.version").value(1));

    // Unpin with stale version
    String unpinJsonStale = String.format("{\"version\": %d}", 0);
    mockMvc
        .perform(
            post("/notes/" + note.id() + "/unpin")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(unpinJsonStale))
        .andExpect(status().isConflict());

    // Unpin with valid version
    String unpinJson = String.format("{\"version\": %d}", 1);
    mockMvc
        .perform(
            post("/notes/" + note.id() + "/unpin")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(unpinJson))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pinned").value(false))
        .andExpect(jsonPath("$.version").value(2));
  }

  @Test
  @DisplayName("POST /notes/{id}/archive and restore manage archived state")
  void archiveAndRestoreNote() throws Exception {
    Note note =
        noteRepository.save(
            new Note(
                UUID.randomUUID(),
                userId,
                "ToArchive",
                "content",
                false,
                false,
                Instant.now(),
                Instant.now(),
                Set.of(),
                List.of(),
                0L));

    String archiveJson = String.format("{\"version\": %d}", note.version());
    mockMvc
        .perform(
            post("/notes/" + note.id() + "/archive")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(archiveJson))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archived").value(true))
        .andExpect(jsonPath("$.version").value(1));

    String restoreJson = String.format("{\"version\": %d}", 1);
    mockMvc
        .perform(
            post("/notes/" + note.id() + "/restore")
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value())
                .contentType(MediaType.APPLICATION_JSON)
                .content(restoreJson))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archived").value(false))
        .andExpect(jsonPath("$.version").value(2));
  }

  @Test
  @DisplayName("GET /notes queries notes by search term and filters")
  void queryNotes() throws Exception {
    Note note1 =
        noteRepository.save(
            new Note(
                UUID.randomUUID(),
                userId,
                "Quick start guide",
                "Learn Markdown layout",
                false,
                false,
                Instant.now(),
                Instant.now(),
                Set.of(),
                List.of(),
                0L));
    Note note2 =
        noteRepository.save(
            new Note(
                UUID.randomUUID(),
                userId,
                "Project ideas",
                "Build a web app using Spring",
                true,
                false,
                Instant.now(),
                Instant.now(),
                Set.of(),
                List.of(),
                0L));

    // Test text search q matches body text
    mockMvc
        .perform(get("/notes").param("q", "Markdown").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].id").value(note1.id().toString()))
        .andExpect(jsonPath("$.totalItems").value(1));

    // Test pinned filter
    mockMvc
        .perform(get("/notes").param("pinned", "true").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].id").value(note2.id().toString()))
        .andExpect(jsonPath("$.totalItems").value(1));
  }

  @Test
  @DisplayName("Verify note bodies are redacted in all toString implementations")
  void verifyRedactionInToString() {
    UUID noteId = UUID.randomUUID();
    Note note =
        new Note(
            noteId,
            userId,
            "Meeting",
            "Discuss password",
            false,
            false,
            Instant.now(),
            Instant.now(),
            Set.of(),
            List.of(),
            0L);
    assertThat(note.toString()).doesNotContain("Discuss password").contains("REDACTED");

    NoteQuery query =
        new NoteQuery(
            userId, "Discuss password", false, false, Set.of(), 0, 10, "updatedAt", "DESC");
    assertThat(query.toString()).doesNotContain("Discuss password").contains("REDACTED");

    CreateNoteCommand createCmd =
        new CreateNoteCommand("Meeting", "Discuss password", Set.of(), List.of());
    assertThat(createCmd.toString()).doesNotContain("Discuss password").contains("REDACTED");

    UpdateNoteCommand updateCmd =
        new UpdateNoteCommand("Meeting", "Discuss password", Set.of(), List.of());
    assertThat(updateCmd.toString()).doesNotContain("Discuss password").contains("REDACTED");

    CreateNoteRequest createReq =
        new CreateNoteRequest("Meeting", "Discuss password", Set.of(), List.of());
    assertThat(createReq.toString()).doesNotContain("Discuss password").contains("REDACTED");

    UpdateNoteRequest updateReq =
        new UpdateNoteRequest("Meeting", "Discuss password", Set.of(), List.of(), 0L);
    assertThat(updateReq.toString()).doesNotContain("Discuss password").contains("REDACTED");

    NoteResponse response = NoteResponse.fromDomain(note);
    assertThat(response.toString()).doesNotContain("Discuss password").contains("REDACTED");
  }
}
