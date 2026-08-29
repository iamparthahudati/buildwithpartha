package tech.buildwithpartha.lifeos.report.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.report.application.NamedReportResult;
import tech.buildwithpartha.lifeos.report.application.NamedReportService;
import tech.buildwithpartha.lifeos.report.application.ReportDefinition;
import tech.buildwithpartha.lifeos.report.domain.NamedReportType;

/** Authenticated REST controller for named reports and report generation (LOS-1109). */
@RestController
@RequestMapping("/reports")
@SecurityRequirement(name = "sessionCookie")
public class ReportController {

  private static final String PRIVATE_NO_STORE_CACHE_CONTROL =
      "private, no-store, max-age=0, must-revalidate";

  private final NamedReportService namedReportService;

  public ReportController(NamedReportService namedReportService) {
    this.namedReportService = namedReportService;
  }

  @Operation(
      summary = "List named report definitions",
      description =
          "Returns all available named report definition metadata including supported filters, "
              + "default timeframes, and asynchronous processing thresholds.")
  @ApiResponse(responseCode = "200", description = "List of report definitions.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @GetMapping("/definitions")
  public ResponseEntity<List<ReportDefinitionResponse>> getReportDefinitions() {
    List<ReportDefinitionResponse> response =
        namedReportService.getDefinitions().stream().map(ReportDefinitionResponse::from).toList();

    return ResponseEntity.ok()
        .header(HttpHeaders.CACHE_CONTROL, PRIVATE_NO_STORE_CACHE_CONTROL)
        .body(response);
  }

  @Operation(
      summary = "Get a named report definition",
      description = "Returns report definition metadata for a specific named report type.")
  @ApiResponse(responseCode = "200", description = "Report definition metadata.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @GetMapping("/definitions/{reportType}")
  public ResponseEntity<ReportDefinitionResponse> getReportDefinition(
      @PathVariable NamedReportType reportType) {
    ReportDefinition def = namedReportService.getDefinition(reportType);

    return ResponseEntity.ok()
        .header(HttpHeaders.CACHE_CONTROL, PRIVATE_NO_STORE_CACHE_CONTROL)
        .body(ReportDefinitionResponse.from(def));
  }

  @Operation(
      summary = "Generate report data",
      description =
          "Generates report data containing summary metrics, tables, chart series, and "
              + "asynchronous threshold status for the specified report type and filters.")
  @ApiResponse(responseCode = "200", description = "Generated report data.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @GetMapping("/generate")
  public ResponseEntity<ReportDataResponse> generateReport(
      @AuthenticationPrincipal UUID userId,
      @RequestParam("reportType") NamedReportType reportType,
      @RequestParam(value = "startDate", required = false) LocalDate startDate,
      @RequestParam(value = "endDate", required = false) LocalDate endDate,
      @RequestParam("timeZone") String timeZone,
      @RequestParam(value = "projectId", required = false) UUID projectId,
      @RequestParam(value = "labelId", required = false) UUID labelId,
      @RequestParam(value = "category", required = false) String category) {

    NamedReportResult result =
        namedReportService.generateReport(
            userId, reportType, startDate, endDate, timeZone, projectId, labelId, category);

    return ResponseEntity.ok()
        .header(HttpHeaders.CACHE_CONTROL, PRIVATE_NO_STORE_CACHE_CONTROL)
        .body(ReportDataResponse.from(result));
  }

  @Operation(
      summary = "Generate named report data by type path",
      description = "Generates report data for the named report type specified in path variable.")
  @ApiResponse(responseCode = "200", description = "Generated report data.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @GetMapping("/named/{reportType}")
  public ResponseEntity<ReportDataResponse> generateNamedReport(
      @AuthenticationPrincipal UUID userId,
      @PathVariable NamedReportType reportType,
      @RequestParam(value = "startDate", required = false) LocalDate startDate,
      @RequestParam(value = "endDate", required = false) LocalDate endDate,
      @RequestParam("timeZone") String timeZone,
      @RequestParam(value = "projectId", required = false) UUID projectId,
      @RequestParam(value = "labelId", required = false) UUID labelId,
      @RequestParam(value = "category", required = false) String category) {

    NamedReportResult result =
        namedReportService.generateReport(
            userId, reportType, startDate, endDate, timeZone, projectId, labelId, category);

    return ResponseEntity.ok()
        .header(HttpHeaders.CACHE_CONTROL, PRIVATE_NO_STORE_CACHE_CONTROL)
        .body(ReportDataResponse.from(result));
  }
}
