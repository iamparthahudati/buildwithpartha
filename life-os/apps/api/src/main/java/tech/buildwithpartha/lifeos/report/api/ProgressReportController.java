package tech.buildwithpartha.lifeos.report.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.report.application.ProgressAggregationService;
import tech.buildwithpartha.lifeos.report.application.ProgressReportSummary;

/** Authenticated REST controller for progress aggregation queries (LOS-1106). */
@RestController
@RequestMapping("/reports/progress")
@SecurityRequirement(name = "sessionCookie")
public class ProgressReportController {

  private static final String PRIVATE_NO_STORE_CACHE_CONTROL =
      "private, no-store, max-age=0, must-revalidate";

  private final ProgressAggregationService progressAggregationService;

  public ProgressReportController(ProgressAggregationService progressAggregationService) {
    this.progressAggregationService = progressAggregationService;
  }

  @Operation(
      summary = "Get progress aggregation report",
      description =
          "Returns aggregated metrics and accessible summary text across tasks, focus time, "
              + "projects, goals, habits, and reviews for a specified date range and filters.")
  @ApiResponse(responseCode = "200", description = "Progress aggregation report.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @GetMapping
  public ResponseEntity<ProgressReportResponse> getProgressReport(
      @AuthenticationPrincipal UUID userId,
      @RequestParam(value = "startDate", required = false) LocalDate startDate,
      @RequestParam(value = "endDate", required = false) LocalDate endDate,
      @RequestParam("timeZone") String timeZone,
      @RequestParam(value = "projectId", required = false) UUID projectId,
      @RequestParam(value = "labelId", required = false) UUID labelId,
      @RequestParam(value = "category", required = false) String category) {

    ProgressReportSummary summary =
        progressAggregationService.getProgressReport(
            userId, startDate, endDate, timeZone, projectId, labelId, category);

    return ResponseEntity.ok()
        .header(HttpHeaders.CACHE_CONTROL, PRIVATE_NO_STORE_CACHE_CONTROL)
        .body(ProgressReportResponse.from(summary));
  }
}
