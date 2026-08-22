package tech.buildwithpartha.lifeos.export.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
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
import tech.buildwithpartha.lifeos.auth.domain.AccountStatus;
import tech.buildwithpartha.lifeos.auth.domain.EmailAddress;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;
import tech.buildwithpartha.lifeos.common.export.ExportFileKind;
import tech.buildwithpartha.lifeos.common.export.ExportFilePort;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class DataExportControllerTests {

  private static final String CSRF_HEADER_NAME = "X-CSRF-TOKEN";

  private final MockMvc mockMvc;
  private final UserRepository userRepository;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final ExportFilePort exportFilePort;

  private UUID userId;
  private Cookie sessionCookie;
  private RawToken csrfToken;

  @Autowired
  DataExportControllerTests(
      MockMvc mockMvc,
      UserRepository userRepository,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator,
      ExportFilePort exportFilePort) {
    this.mockMvc = mockMvc;
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
    this.exportFilePort = exportFilePort;
  }

  @BeforeEach
  void setUp() {
    Instant now = Instant.now();
    userId = UUID.randomUUID();

    User user =
        new User(
            userId,
            EmailAddress.of("export-user-" + userId + "@example.test"),
            "Export User",
            "America/New_York",
            "en-US",
            1,
            AccountStatus.ACTIVE,
            Optional.of(now),
            now,
            now,
            0L);
    userRepository.save(user);

    RawToken sessionToken = tokenGenerator.generate();
    csrfToken = tokenGenerator.generate();
    Session session =
        new Session(
            UUID.randomUUID(),
            userId,
            tokenGenerator.hash(sessionToken.value()),
            tokenGenerator.hash(csrfToken.value()),
            now,
            now,
            now.plusSeconds(3600),
            Optional.empty(),
            Optional.of("Test Browser"));
    sessionRepository.save(session);
    sessionCookie = new Cookie("lifeos_session", sessionToken.value());
  }

  @Test
  void requestExport_whenAuthenticated_returnsAccepted() throws Exception {
    mockMvc
        .perform(
            post("/auth/export").cookie(sessionCookie).header(CSRF_HEADER_NAME, csrfToken.value()))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("GENERATING"))
        .andExpect(jsonPath("$.fileName").isNotEmpty())
        .andExpect(jsonPath("$.id").isNotEmpty());
  }

  @Test
  void requestExport_unauthenticated_returnsUnauthorized() throws Exception {
    mockMvc.perform(post("/auth/export")).andExpect(status().isUnauthorized());
  }

  @Test
  void getExportStatus_returnsUserExports() throws Exception {
    mockMvc
        .perform(get("/auth/export/status").cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.exports").isArray());
  }

  @Test
  void downloadExport_validToken_streamsZipArchive() throws Exception {
    UUID exportId =
        exportFilePort.initExport(
            userId, Optional.empty(), ExportFileKind.FULL_DATA_EXPORT, "archive.zip");
    byte[] content = "fake zip content".getBytes(StandardCharsets.UTF_8);
    String token =
        exportFilePort.storeAndMarkReady(
            exportId, new ByteArrayInputStream(content), content.length, Duration.ofMinutes(30));

    byte[] downloaded =
        mockMvc
            .perform(get("/auth/export/download").cookie(sessionCookie).param("token", token))
            .andExpect(status().isOk())
            .andExpect(
                header().string("Content-Disposition", "attachment; filename=\"archive.zip\""))
            .andExpect(
                header().string("Cache-Control", "private, no-cache, no-store, must-revalidate"))
            .andReturn()
            .getResponse()
            .getContentAsByteArray();

    assertThat(downloaded).isEqualTo(content);
  }
}
