package tech.buildwithpartha.lifeos.export.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.common.export.ExportSummary;
import tech.buildwithpartha.lifeos.export.application.DataExportService;
import tech.buildwithpartha.lifeos.export.application.ExportDownloadService;

/**
 * Authenticated endpoints for requesting, inspecting, and streaming personal data exports
 * (LOS-0517).
 */
@RestController
@RequestMapping("/auth/export")
@SecurityRequirement(name = "sessionCookie")
public class DataExportController {

  private final DataExportService dataExportService;
  private final ExportDownloadService exportDownloadService;

  public DataExportController(
      DataExportService dataExportService, ExportDownloadService exportDownloadService) {
    this.dataExportService = dataExportService;
    this.exportDownloadService = exportDownloadService;
  }

  @Operation(
      summary = "Request personal data export",
      description =
          "Enqueues an asynchronous background job to assemble a complete machine-readable"
              + " archive of account data (subject to active quota).")
  @ApiResponse(responseCode = "202", description = "Export requested successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping
  public ResponseEntity<ExportItemResponse> requestExport(@AuthenticationPrincipal UUID userId) {
    ExportSummary summary =
        dataExportService.requestExport(userId, Optional.empty(), Optional.empty());
    return ResponseEntity.accepted().body(ExportItemResponse.from(summary));
  }

  @Operation(
      summary = "List data export requests",
      description = "Returns all past and active export requests for the authenticated user.")
  @ApiResponse(responseCode = "200", description = "List of exports.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/status")
  public ExportListResponse getExportStatus(@AuthenticationPrincipal UUID userId) {
    List<ExportItemResponse> items =
        dataExportService.getExports(userId).stream().map(ExportItemResponse::from).toList();
    return new ExportListResponse(items);
  }

  @Operation(
      summary = "Download export archive",
      description = "Streams the private export archive using a valid, short-lived download token.")
  @ApiResponse(responseCode = "200", description = "File content stream.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "410", description = "Download token or file has expired.")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/download")
  public void downloadExport(
      @AuthenticationPrincipal UUID userId,
      @RequestParam("token") String token,
      HttpServletResponse response)
      throws IOException {
    ExportDownloadService.DownloadPayload payload =
        exportDownloadService.openDownloadStream(token, userId);

    response.setContentType(MediaType.APPLICATION_OCTET_STREAM_VALUE);
    response.setHeader(
        HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + payload.fileName() + "\"");
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
}
