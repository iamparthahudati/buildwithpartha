package tech.buildwithpartha.lifeos.attachment.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tech.buildwithpartha.lifeos.attachment.application.AttachmentDownloadService;
import tech.buildwithpartha.lifeos.attachment.application.AttachmentDownloadService.DownloadPayload;
import tech.buildwithpartha.lifeos.attachment.application.AttachmentService;
import tech.buildwithpartha.lifeos.attachment.domain.Attachment;
import tech.buildwithpartha.lifeos.attachment.domain.AttachmentEntityType;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;

/**
 * REST controller for attachment upload, metadata retrieval, download proxying, and deletion
 * (ADR-015).
 */
@RestController
@RequestMapping("/attachments")
@SecurityRequirement(name = "sessionCookie")
public class AttachmentController {

  private final AttachmentService attachmentService;
  private final AttachmentDownloadService downloadService;
  private final boolean featureEnabled;

  public AttachmentController(
      AttachmentService attachmentService,
      AttachmentDownloadService downloadService,
      @Value("${lifeos.features.attachments.enabled:false}") boolean featureEnabled) {
    this.attachmentService = attachmentService;
    this.downloadService = downloadService;
    this.featureEnabled = featureEnabled;
  }

  private void verifyFeatureEnabled() {
    if (!featureEnabled) {
      throw new ResourceNotFoundException("Attachment feature disabled.");
    }
  }

  @Operation(
      summary = "Upload attachment file",
      description =
          "Validates file size, quotas, MIME type, and magic bytes before saving metadata and"
              + " enqueuing background malware scanning.")
  @ApiResponse(responseCode = "201", description = "Attachment upload accepted and scan enqueued.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<AttachmentResponse> uploadAttachment(
      @AuthenticationPrincipal UUID userId,
      @RequestParam("file") MultipartFile file,
      @RequestParam("entityType") AttachmentEntityType entityType,
      @RequestParam("entityId") UUID entityId)
      throws IOException {
    verifyFeatureEnabled();

    if (file.isEmpty()) {
      throw new tech.buildwithpartha.lifeos.common.error.CodedException(
          tech.buildwithpartha.lifeos.common.error.StandardErrorCodes.VALIDATION_FAILED,
          "Uploaded file must not be empty.") {};
    }

    String contentType = file.getContentType();
    if (contentType == null || contentType.isBlank()) {
      contentType = "application/octet-stream";
    }

    Attachment attachment =
        attachmentService.uploadAttachment(
            userId, entityType, entityId, file.getOriginalFilename(), contentType, file.getBytes());

    return ResponseEntity.status(HttpStatus.CREATED).body(AttachmentResponse.from(attachment));
  }

  @Operation(
      summary = "List entity attachments",
      description =
          "Returns active metadata records for attachments belonging to a Task or Project.")
  @ApiResponse(responseCode = "200", description = "Attachment metadata list.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @GetMapping
  public AttachmentListResponse listAttachments(
      @AuthenticationPrincipal UUID userId,
      @RequestParam("entityType") AttachmentEntityType entityType,
      @RequestParam("entityId") UUID entityId) {
    verifyFeatureEnabled();

    List<AttachmentResponse> items =
        attachmentService.getEntityAttachments(userId, entityType, entityId).stream()
            .map(AttachmentResponse::from)
            .toList();

    return new AttachmentListResponse(items);
  }

  @Operation(
      summary = "Get attachment metadata",
      description = "Returns metadata for a specific attachment by ID.")
  @ApiResponse(responseCode = "200", description = "Attachment metadata.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @GetMapping("/{id}")
  public AttachmentResponse getAttachment(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    verifyFeatureEnabled();

    Attachment attachment = attachmentService.getAttachment(userId, id);
    return AttachmentResponse.from(attachment);
  }

  @Operation(
      summary = "Download attachment binary",
      description =
          "Streams clean attachment binary with security disposition headers. Locked if scan is"
              + " pending or quarantined.")
  @ApiResponse(responseCode = "200", description = "Binary content stream.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", description = "Quarantined attachment download rejected.")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "423", description = "Pending scan download locked.")
  @GetMapping("/{id}/download")
  public void downloadAttachment(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      HttpServletResponse response)
      throws IOException {
    verifyFeatureEnabled();

    DownloadPayload payload = downloadService.openDownloadStream(userId, id);

    response.setContentType(payload.contentType());
    response.setHeader(
        HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + payload.fileName() + "\"");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Security-Policy", "default-src 'none'");
    response.setHeader(HttpHeaders.CACHE_CONTROL, "private, no-cache, no-store, must-revalidate");
    response.setHeader(HttpHeaders.PRAGMA, "no-cache");
    response.setHeader(HttpHeaders.EXPIRES, "0");
    if (payload.fileSizeBytes() > 0) {
      response.setHeader(HttpHeaders.CONTENT_LENGTH, String.valueOf(payload.fileSizeBytes()));
    }

    try (InputStream in = payload.contentStream();
        OutputStream out = response.getOutputStream()) {
      byte[] buffer = new byte[8192];
      int read;
      while ((read = in.read(buffer)) != -1) {
        out.write(buffer, 0, read);
      }
      out.flush();
    }
  }

  @Operation(
      summary = "Delete attachment",
      description = "Soft-deletes attachment metadata and enqueues object purge from storage.")
  @ApiResponse(responseCode = "204", description = "Attachment deleted successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteAttachment(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    verifyFeatureEnabled();

    attachmentService.deleteAttachment(userId, id);
    return ResponseEntity.noContent().build();
  }
}
