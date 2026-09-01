package tech.buildwithpartha.lifeos.attachment.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tech.buildwithpartha.lifeos.attachment.application.AttachmentDownloadService;
import tech.buildwithpartha.lifeos.attachment.application.AttachmentService;
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentEntityType;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentRepository;
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
class AttachmentControllerTests {

  @Autowired private MockMvc mockMvc;
  @Autowired private UserRepository userRepository;
  @Autowired private SessionRepository sessionRepository;
  @Autowired private SecureTokenGenerator tokenGenerator;
  @Autowired private AttachmentService attachmentService;
  @Autowired private AttachmentDownloadService attachmentDownloadService;
  @Autowired private AttachmentRepository attachmentRepository;

  private UUID userId;
  private Cookie sessionCookie;
  private RawToken csrfToken;
  private UUID entityId;

  @BeforeEach
  void setUp() {
    Instant now = Instant.now();
    userId =
        userRepository
            .save(
                User.signup(
                        UUID.randomUUID(),
                        EmailAddress.of("attachment-owner-" + UUID.randomUUID() + "@example.test"),
                        "Attachment Owner",
                        now)
                    .verify(now))
            .id();

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
    entityId = UUID.randomUUID();
  }

  @Test
  @DisplayName("POST /attachments uploads file and returns 201 Created")
  void uploadAttachmentEndpoint() throws Exception {
    byte[] pdfHeader = new byte[] {0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34}; // %PDF-1.4
    MockMultipartFile multipartFile =
        new MockMultipartFile("file", "document.pdf", "application/pdf", pdfHeader);

    mockMvc
        .perform(
            multipart("/attachments")
                .file(multipartFile)
                .param("entityType", "TASK")
                .param("entityId", entityId.toString())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").exists())
        .andExpect(jsonPath("$.fileName").value("document.pdf"))
        .andExpect(jsonPath("$.status").value("PENDING_SCAN"));
  }

  @Test
  @DisplayName("GET /attachments lists entity attachments")
  void listAttachmentsEndpoint() throws Exception {
    byte[] pdfHeader = new byte[] {0x25, 0x50, 0x44, 0x46};
    attachmentService.uploadAttachment(
        userId, AttachmentEntityType.TASK, entityId, "doc1.pdf", "application/pdf", pdfHeader);

    mockMvc
        .perform(
            get("/attachments")
                .param("entityType", "TASK")
                .param("entityId", entityId.toString())
                .cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isArray())
        .andExpect(jsonPath("$.items[0].fileName").value("doc1.pdf"));
  }

  @Test
  @DisplayName("DELETE /attachments/{id} soft deletes attachment")
  void deleteAttachmentEndpoint() throws Exception {
    byte[] pdfHeader = new byte[] {0x25, 0x50, 0x44, 0x46};
    Attachment created =
        attachmentService.uploadAttachment(
            userId,
            AttachmentEntityType.TASK,
            entityId,
            "to-delete.pdf",
            "application/pdf",
            pdfHeader);

    mockMvc
        .perform(
            delete("/attachments/{id}", created.getId())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/attachments/{id}", created.getId()).cookie(sessionCookie))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("GET /attachments/{id}/download enforces download disposition and security headers")
  void downloadHeadersCheck() throws Exception {
    byte[] pdfHeader = new byte[] {0x25, 0x50, 0x44, 0x46};
    Attachment created =
        attachmentService.uploadAttachment(
            userId, AttachmentEntityType.TASK, entityId, "test.pdf", "application/pdf", pdfHeader);
    created.markClean(Instant.now());
    attachmentRepository.save(created);

    mockMvc
        .perform(get("/attachments/{id}/download", created.getId()).cookie(sessionCookie))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("Content-Security-Policy", "default-src 'none'"))
        .andExpect(
            header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"test.pdf\""));
  }

  @Test
  @DisplayName("POST /attachments rejects empty file upload")
  void emptyFileUploadCheck() throws Exception {
    MockMultipartFile emptyFile =
        new MockMultipartFile("file", "empty.txt", "text/plain", new byte[0]);

    mockMvc
        .perform(
            multipart("/attachments")
                .file(emptyFile)
                .param("entityType", "TASK")
                .param("entityId", entityId.toString())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("POST /attachments defaults contentType when missing")
  void missingContentTypeDefaultsToOctetStream() throws Exception {
    byte[] pdfHeader = new byte[] {0x25, 0x50, 0x44, 0x46};
    MockMultipartFile fileNoType = new MockMultipartFile("file", "doc.pdf", "", pdfHeader);

    mockMvc
        .perform(
            multipart("/attachments")
                .file(fileNoType)
                .param("entityType", "TASK")
                .param("entityId", entityId.toString())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isBadRequest()); // Octet-stream is rejected by MimeValidator
  }

  @Test
  @DisplayName("AttachmentController throws NotFound when feature is disabled")
  void featureDisabledRejectsCalls() {
    AttachmentController disabledController =
        new AttachmentController(attachmentService, attachmentDownloadService, false);

    org.assertj.core.api.Assertions.assertThatThrownBy(
            () -> disabledController.getAttachment(userId, UUID.randomUUID()))
        .isInstanceOf(tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException.class)
        .hasMessageContaining("Attachment feature disabled.");
  }

  @Test
  @DisplayName("AttachmentController responds 404 when feature toggle is disabled")
  void featureDisabledCheck() throws Exception {
    AttachmentController disabledController =
        new AttachmentController(attachmentService, null, false);

    org.assertj.core.api.Assertions.assertThatThrownBy(
            () -> disabledController.getAttachment(userId, UUID.randomUUID()))
        .isInstanceOf(tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException.class);
  }

  @Test
  @DisplayName("POST /attachments rejects forbidden executable filename")
  void rejectsForbiddenFilename() throws Exception {
    byte[] pdfHeader = new byte[] {0x25, 0x50, 0x44, 0x46};
    MockMultipartFile exeFile =
        new MockMultipartFile("file", "malware.exe", "application/pdf", pdfHeader);

    mockMvc
        .perform(
            multipart("/attachments")
                .file(exeFile)
                .param("entityType", "TASK")
                .param("entityId", entityId.toString())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("POST /attachments rejects invalid MIME type")
  void rejectsInvalidMimeType() throws Exception {
    byte[] content = new byte[] {0x00, 0x01};
    MockMultipartFile htmlFile = new MockMultipartFile("file", "page.html", "text/html", content);

    mockMvc
        .perform(
            multipart("/attachments")
                .file(htmlFile)
                .param("entityType", "TASK")
                .param("entityId", entityId.toString())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("POST /attachments rejects header magic bytes mismatch")
  void rejectsMagicBytesMismatch() throws Exception {
    byte[] fakeHeader = new byte[] {0x00, 0x00, 0x00, 0x00};
    MockMultipartFile fakePdf =
        new MockMultipartFile("file", "fake.pdf", "application/pdf", fakeHeader);

    mockMvc
        .perform(
            multipart("/attachments")
                .file(fakePdf)
                .param("entityType", "TASK")
                .param("entityId", entityId.toString())
                .cookie(sessionCookie)
                .header("X-CSRF-TOKEN", csrfToken.value()))
        .andExpect(status().isBadRequest());
  }
}
