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
import tech.buildwithpartha.lifeos.report.application.TimeGoalService;

/** Authenticated, read-only daily time report projection. */
@RestController
@RequestMapping("/reports/time")
@SecurityRequirement(name = "sessionCookie")
public class TimeReportController {

  private static final String PRIVATE_NO_STORE_CACHE_CONTROL =
      "private, no-store, max-age=0, must-revalidate";

  private final TimeGoalService timeGoalService;

  public TimeReportController(TimeGoalService timeGoalService) {
    this.timeGoalService = timeGoalService;
  }

  @Operation(
      summary = "Get a daily time summary",
      description =
          "Returns completed Focus Session time, planned Focus Time Blocks, the optional daily "
              + "target, and the labelled comparison denominator for one local date.")
  @ApiResponse(responseCode = "200", description = "Daily time summary.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @GetMapping
  public ResponseEntity<DailyTimeSummaryResponse> getDailyTimeSummary(
      @AuthenticationPrincipal UUID userId,
      @RequestParam("date") LocalDate localDate,
      @RequestParam("timeZone") String timeZone) {
    DailyTimeSummaryResponse response =
        DailyTimeSummaryResponse.fromSummary(
            timeGoalService.getDailySummary(userId, localDate, timeZone));
    return ResponseEntity.ok()
        .header(HttpHeaders.CACHE_CONTROL, PRIVATE_NO_STORE_CACHE_CONTROL)
        .body(response);
  }
}
