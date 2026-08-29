package tech.buildwithpartha.lifeos.calendar.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.calendar.application.CalendarQuery;
import tech.buildwithpartha.lifeos.calendar.application.CalendarService;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceType;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;

/** Authenticated read API for the LifeOS Calendar projection. */
@RestController
@RequestMapping("/calendar/events")
@SecurityRequirement(name = "sessionCookie")
public class CalendarController {

  private final CalendarService calendarService;

  public CalendarController(CalendarService calendarService) {
    this.calendarService = calendarService;
  }

  @Operation(
      summary = "Query Calendar events",
      description =
          "Returns owner-scoped canonical records for an inclusive local-date range. "
              + "The range is interpreted in timeZone and is limited to 62 days and 500 events.")
  @ApiResponse(responseCode = "200", description = "Deterministically ordered Calendar events.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @GetMapping
  public CalendarResponse queryEvents(
      @AuthenticationPrincipal UUID userId,
      @RequestParam(name = "startDate") LocalDate startDate,
      @RequestParam(name = "endDate") LocalDate endDate,
      @RequestParam(name = "timeZone") String timeZone,
      @RequestParam(name = "source", required = false) Set<String> sourceNames,
      @RequestParam(name = "limit", defaultValue = "500") int limit) {

    ZoneId zoneId = parseZoneId(timeZone);
    Set<CalendarSourceType> sourceTypes = parseSourceTypes(sourceNames);
    CalendarQuery query = new CalendarQuery(userId, startDate, endDate, zoneId, sourceTypes, limit);
    return CalendarResponse.fromApplication(calendarService.query(query));
  }

  private static ZoneId parseZoneId(String timeZone) {
    try {
      return ZoneId.of(timeZone);
    } catch (DateTimeException exception) {
      throw new FieldValidationException(
          "Invalid Calendar timezone", List.of(new FieldProblem("timeZone", "INVALID")));
    }
  }

  private static Set<CalendarSourceType> parseSourceTypes(Set<String> sourceNames) {
    if (sourceNames == null) {
      return EnumSet.allOf(CalendarSourceType.class);
    }
    EnumSet<CalendarSourceType> parsed = EnumSet.noneOf(CalendarSourceType.class);
    try {
      for (String sourceName : sourceNames) {
        parsed.add(CalendarSourceType.valueOf(sourceName.toUpperCase(Locale.ROOT)));
      }
      return parsed;
    } catch (IllegalArgumentException exception) {
      throw new FieldValidationException(
          "Invalid Calendar source", List.of(new FieldProblem("source", "INVALID")));
    }
  }
}
