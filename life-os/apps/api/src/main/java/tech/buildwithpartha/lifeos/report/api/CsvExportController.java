package tech.buildwithpartha.lifeos.report.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.io.InputStream;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.common.export.ExportDownloadPayload;
import tech.buildwithpartha.lifeos.common.export.ExportFileKind;
import tech.buildwithpartha.lifeos.common.export.ExportFilePort;
import tech.buildwithpartha.lifeos.report.application.CsvExportService;
import tech.buildwithpartha.lifeos.report.application.NamedReportResult;
import tech.buildwithpartha.lifeos.report.application.NamedReportService;
import tech.buildwithpartha.lifeos.report.domain.NamedReportType;

/**
 * Authenticated REST controller for synchronous CSV report export and private token-based download
 * (LOS-1111).
 *
 * <p>Endpoint contract:
 *
 * <ul>
 *   <li>{@code POST /reports/export/csv} — Generates report data, encodes as RFC 4180 CSV, stores
 *       in private export storage, returns a {@link CsvExportResponse} with a short-lived download
 *       token. Ranges &gt; 90 days are rejected with {@code 400 RANGE_EXCEEDS_ASYNC_THRESHOLD} to
 *       enforce synchronous-only execution for the MVP.
 *   <li>{@code GET /reports/export/csv/download} — Accepts the one-time download token, validates
 *       ownership and expiry via {@link ExportFilePort#openDownloadStream}, and streams the CSV
 *       file with {@code Content-Disposition: attachment}.
 * </ul>
 *
 * <p>Security:
 *
 * <ul>
 *   <li>Session cookie authentication is required on both endpoints.
 *   <li>Download token is a 32-byte cryptographically random hex value; only its SHA-256 hash is
 *       persisted.
 *   <li>The token TTL is 15 minutes; after expiry the file is inaccessible.
 *   <li>Cross-user token attempts are indistinguishable from invalid tokens ({@code 404}).
 *   <li>No content sniffing: {@code X-Content-Type-Options: nosniff} is emitted by global filters.
 * </ul>
 */
@RestController
@RequestMapping("/reports/export")
@SecurityRequirement(name = "sessionCookie")
public class CsvExportController {

  /** Short-lived download token validity for report CSV files. */
  static final Duration CSV_TOKEN_TTL = Duration.ofMinutes(15);

  /** Private no-store cache directive applied to all responses. */
  private static final String PRIVATE_NO_STORE = "private, no-store, max-age=0, must-revalidate";

  private final NamedReportService namedReportService;
  private final CsvExportService csvExportService;
  private final ExportFilePort exportFilePort;

  public CsvExportController(
      NamedReportService namedReportService,
      CsvExportService csvExportService,
      ExportFilePort exportFilePort) {
    this.namedReportService = namedReportService;
    this.csvExportService = csvExportService;
    this.exportFilePort = exportFilePort;
  }

  // ---------------------------------------------------------------------------
  // POST /reports/export/csv — generate and store CSV, return download token
  // ---------------------------------------------------------------------------

  @Operation(
      summary = "Generate CSV report export",
      description =
          "Generates report data, encodes it as RFC 4180 CSV with BOM and metadata header, "
              + "stores it in private export storage, and returns a short-lived (15-minute) "
              + "download token. Only date ranges <= 90 days are supported synchronously. "
              + "The returned token must be redeemed via GET /reports/export/csv/download.")
  @ApiResponse(responseCode = "200", description = "CSV export created; token issued.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @PostMapping("/csv")
  public ResponseEntity<CsvExportResponse> requestCsvExport(
      @AuthenticationPrincipal UUID userId,
      @RequestParam("reportType") NamedReportType reportType,
      @RequestParam(value = "startDate", required = false) LocalDate startDate,
      @RequestParam(value = "endDate", required = false) LocalDate endDate,
      @RequestParam("timeZone") String timeZone,
      @RequestParam(value = "projectId", required = false) UUID projectId,
      @RequestParam(value = "labelId", required = false) UUID labelId,
      @RequestParam(value = "category", required = false) String category) {

    // 1. Generate the report (validates timezone, date range, range ≤ 366 days)
    NamedReportResult result =
        namedReportService.generateReport(
            userId, reportType, startDate, endDate, timeZone, projectId, labelId, category);

    // 2. Reject async threshold (>90 days) for synchronous CSV MVP
    if (result.isAsynchronous()) {
      throw new tech.buildwithpartha.lifeos.common.error.FieldValidationException(
          "Validation failed",
          java.util.List.of(
              new tech.buildwithpartha.lifeos.common.error.FieldProblem(
                  "startDate", "RANGE_EXCEEDS_ASYNC_THRESHOLD")));
    }

    // 3. Build CSV bytes
    long byteLength = csvExportService.computeCsvByteLength(result);
    InputStream csvStream = csvExportService.generateCsv(result);

    // 4. Build filename
    String fileName =
        csvExportService.buildFileName(
            result.reportType().name(), result.startDate(), result.endDate(), result.timeZone());

    // 5. Store in private export storage using ExportFilePort
    UUID exportId =
        exportFilePort.initExport(
            userId, Optional.empty(), ExportFileKind.REPORT_CSV_EXPORT, fileName);
    String rawToken =
        exportFilePort.storeAndMarkReady(exportId, csvStream, byteLength, CSV_TOKEN_TTL);

    CsvExportResponse response =
        new CsvExportResponse(
            exportId,
            fileName,
            rawToken,
            CSV_TOKEN_TTL.toMinutes(),
            result.reportType().name(),
            result.startDate().toString(),
            result.endDate().toString(),
            result.timeZone());

    return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, PRIVATE_NO_STORE).body(response);
  }

  // ---------------------------------------------------------------------------
  // GET /reports/export/csv/download — stream CSV from private storage
  // ---------------------------------------------------------------------------

  @Operation(
      summary = "Download CSV export",
      description =
          "Redeems the short-lived download token issued by POST /reports/export/csv and streams "
              + "the CSV file. The token is single-use within its 15-minute validity window. "
              + "Cross-user and expired tokens return 404.")
  @ApiResponse(responseCode = "200", description = "CSV file stream.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @GetMapping("/csv/download")
  public ResponseEntity<InputStreamResource> downloadCsv(
      @AuthenticationPrincipal UUID userId, @RequestParam("token") String rawToken) {

    ExportDownloadPayload payload = exportFilePort.openDownloadStream(rawToken, userId);

    ContentDisposition contentDisposition =
        ContentDisposition.attachment().filename(payload.fileName()).build();

    return ResponseEntity.ok()
        .header(HttpHeaders.CACHE_CONTROL, PRIVATE_NO_STORE)
        .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
        .header("X-Content-Type-Options", "nosniff")
        .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
        .contentLength(payload.fileSizeBytes())
        .body(new InputStreamResource(payload.contentStream()));
  }
}
