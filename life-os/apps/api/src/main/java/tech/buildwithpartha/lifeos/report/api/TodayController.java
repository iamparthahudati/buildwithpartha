package tech.buildwithpartha.lifeos.report.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult;
import tech.buildwithpartha.lifeos.report.application.TodayService;

/** REST controller for the personal dashboard Today aggregation (LOS-0606, LOS-0607). */
@RestController
@RequestMapping("/today")
@SecurityRequirement(name = "sessionCookie")
public class TodayController {

  private static final String PRIVATE_NO_STORE_CACHE_CONTROL =
      "private, no-store, max-age=0, must-revalidate";

  private final TodayService todayService;

  public TodayController(TodayService todayService) {
    this.todayService = todayService;
  }

  @Operation(
      summary = "Get Today dashboard aggregation",
      description =
          "Retrieves the aggregated modules for the current local date, timezone-aware, "
              + "returning typed zero/empty states for unimplemented domains.")
  @ApiResponse(responseCode = "200", description = "Current Today dashboard state.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping
  public ResponseEntity<TodayResponse> getToday(@AuthenticationPrincipal UUID userId) {
    TodayQueryResult queryResult = todayService.getToday(userId);
    TodayResponse response = TodayResponse.fromQueryResult(queryResult);
    return ResponseEntity.ok()
        .header(HttpHeaders.CACHE_CONTROL, PRIVATE_NO_STORE_CACHE_CONTROL)
        .body(response);
  }
}
