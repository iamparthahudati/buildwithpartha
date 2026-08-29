package tech.buildwithpartha.lifeos.habit.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.habit.application.HabitService;
import tech.buildwithpartha.lifeos.habit.application.HabitStatistics;
import tech.buildwithpartha.lifeos.habit.domain.Habit;
import tech.buildwithpartha.lifeos.habit.domain.HabitCadence;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntry;
import tech.buildwithpartha.lifeos.habit.domain.HabitPausePeriod;

/** REST controller exposing Habit endpoints (LOS-1209). */
@RestController
@RequestMapping("/habits")
@SecurityRequirement(name = "sessionCookie")
public class HabitController {

  private final HabitService habitService;

  public HabitController(HabitService habitService) {
    this.habitService = habitService;
  }

  // --- Habit CRUD -----------------------------------------------------------

  @Operation(
      operationId = "createHabit",
      summary = "Create habit",
      description = "Creates a new habit for the current user.")
  @ApiResponse(responseCode = "201", description = "Habit created.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping
  public ResponseEntity<HabitResponse> create(
      @AuthenticationPrincipal UUID userId, @Valid @RequestBody CreateHabitRequest request) {
    HabitCadence cadence = parseCadence(request.cadence());
    validateTimeZone(request.timeZone());
    validateReminder(request.reminderEnabled(), request.reminderTime());

    Habit created = habitService.createHabit(userId, request.toCommand(cadence));
    URI location = URI.create("/life-os/api/v1/habits/" + created.id());
    return ResponseEntity.created(location).body(HabitResponse.fromDomain(created));
  }

  @Operation(
      operationId = "listHabits",
      summary = "List habits",
      description = "Lists the current user's habits.")
  @ApiResponse(responseCode = "200", description = "Habits.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping
  public List<HabitResponse> list(
      @AuthenticationPrincipal UUID userId,
      @RequestParam(name = "archived", required = false) Boolean archived) {
    return habitService.listHabits(userId, Optional.ofNullable(archived)).stream()
        .map(HabitResponse::fromDomain)
        .toList();
  }

  @Operation(
      operationId = "getHabit",
      summary = "Get habit",
      description = "Retrieves a habit by ID.")
  @ApiResponse(responseCode = "200", description = "Habit.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/{id}")
  public HabitResponse get(@AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    return HabitResponse.fromDomain(habitService.getHabit(userId, id));
  }

  @Operation(
      operationId = "updateHabit",
      summary = "Update habit",
      description = "Updates a habit's details and reminder preferences.")
  @ApiResponse(responseCode = "200", description = "Habit updated.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PutMapping("/{id}")
  public HabitResponse update(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody UpdateHabitRequest request) {
    HabitCadence cadence = parseCadence(request.cadence());
    validateTimeZone(request.timeZone());
    validateReminder(request.reminderEnabled(), request.reminderTime());

    Habit updated =
        habitService.updateHabit(userId, id, request.toCommand(cadence), request.version());
    return HabitResponse.fromDomain(updated);
  }

  @Operation(
      operationId = "archiveHabit",
      summary = "Archive habit",
      description = "Archives a habit.")
  @ApiResponse(responseCode = "200", description = "Habit archived.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/archive")
  public HabitResponse archive(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody HabitVersionRequest request) {
    return HabitResponse.fromDomain(habitService.archiveHabit(userId, id, request.version()));
  }

  @Operation(
      operationId = "restoreHabit",
      summary = "Restore habit",
      description = "Restores an archived habit.")
  @ApiResponse(responseCode = "200", description = "Habit restored.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/restore")
  public HabitResponse restore(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody HabitVersionRequest request) {
    return HabitResponse.fromDomain(habitService.restoreHabit(userId, id, request.version()));
  }

  @Operation(
      operationId = "deleteHabit",
      summary = "Delete habit",
      description = "Permanently deletes a habit, its entries, and its pause periods.")
  @ApiResponse(responseCode = "204", description = "Habit deleted.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    habitService.deleteHabit(userId, id);
    return ResponseEntity.noContent().build();
  }

  // --- Completion entries ---------------------------------------------------

  @Operation(
      operationId = "listHabitEntries",
      summary = "List entries in range",
      description =
          "Lists completion entries across an inclusive local-date range of at most 366 days.")
  @ApiResponse(responseCode = "200", description = "Entries.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/{id}/entries")
  public List<HabitEntryResponse> listEntries(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @RequestParam(name = "from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(name = "to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    return habitService.listEntries(userId, id, from, to).stream()
        .map(HabitEntryResponse::fromDomain)
        .toList();
  }

  @Operation(
      operationId = "listTodayHabitEntries",
      summary = "List today's entries",
      description = "Lists today's completion entries in the habit's own timezone.")
  @ApiResponse(responseCode = "200", description = "Today's entries.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/{id}/entries/today")
  public List<HabitEntryResponse> listTodayEntries(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    return habitService.listToday(userId, id).stream().map(HabitEntryResponse::fromDomain).toList();
  }

  @Operation(
      operationId = "incrementHabitEntry",
      summary = "Record completion",
      description =
          "Records (increments) a completion. Defaults to +1 on the habit's own today. "
              + "The existing entry for that local date is incremented instead of duplicated.")
  @ApiResponse(responseCode = "200", description = "Completion recorded.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/entries/increment")
  public HabitEntryResponse increment(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody IncrementHabitEntryRequest request) {
    HabitEntry entry =
        habitService.recordCompletion(
            userId, id, Optional.ofNullable(request.date()), request.byOrDefault());
    return HabitEntryResponse.fromDomain(entry);
  }

  @Operation(
      operationId = "setHabitEntry",
      summary = "Set completion count",
      description = "Sets the absolute completed count for a local date (defaults to today).")
  @ApiResponse(responseCode = "200", description = "Completion count set.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PutMapping("/{id}/entries")
  public HabitEntryResponse setCount(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody SetHabitEntryRequest request) {
    HabitEntry entry =
        habitService.setCount(userId, id, Optional.ofNullable(request.date()), request.count());
    return HabitEntryResponse.fromDomain(entry);
  }

  @Operation(
      operationId = "removeHabitEntry",
      summary = "Remove completion entry",
      description =
          "Removes the completion entry for a local date (defaults to today). Idempotent.")
  @ApiResponse(responseCode = "204", description = "Entry removed (or already absent).")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @DeleteMapping("/{id}/entries")
  public ResponseEntity<Void> removeEntry(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @RequestParam(name = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate date) {
    habitService.removeEntry(userId, id, Optional.ofNullable(date));
    return ResponseEntity.noContent().build();
  }

  // --- Statistics -----------------------------------------------------------

  @Operation(
      operationId = "getHabitStats",
      summary = "Habit statistics",
      description =
          "Window-based completion statistics across an inclusive range of at most 366 days.")
  @ApiResponse(responseCode = "200", description = "Statistics.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/{id}/stats")
  public HabitStatsResponse stats(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @RequestParam(name = "from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(name = "to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    HabitStatistics stats = habitService.statistics(userId, id, from, to);
    return HabitStatsResponse.fromDomain(id, stats);
  }

  // --- Pause periods --------------------------------------------------------

  @Operation(
      operationId = "createHabitPause",
      summary = "Open pause period",
      description = "Opens a pause period for a habit.")
  @ApiResponse(responseCode = "201", description = "Pause period opened.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/pauses")
  public ResponseEntity<HabitPausePeriodResponse> addPause(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody CreateHabitPauseRequest request) {
    if (request.endDate() != null && request.endDate().isBefore(request.startDate())) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("endDate", "INVALID")));
    }
    HabitPausePeriod pause =
        habitService.addPause(
            userId,
            id,
            request.startDate(),
            Optional.ofNullable(request.endDate()),
            Optional.ofNullable(request.reason()));
    URI location = URI.create("/life-os/api/v1/habits/" + id + "/pauses/" + pause.id());
    return ResponseEntity.created(location).body(HabitPausePeriodResponse.fromDomain(pause));
  }

  @Operation(
      operationId = "listHabitPauses",
      summary = "List pause periods",
      description = "Lists a habit's pause periods.")
  @ApiResponse(responseCode = "200", description = "Pause periods.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/{id}/pauses")
  public List<HabitPausePeriodResponse> listPauses(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    return habitService.listPauses(userId, id).stream()
        .map(HabitPausePeriodResponse::fromDomain)
        .toList();
  }

  @Operation(
      operationId = "removeHabitPause",
      summary = "Remove pause period",
      description = "Removes a habit pause period.")
  @ApiResponse(responseCode = "204", description = "Pause period removed.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @DeleteMapping("/{id}/pauses/{pauseId}")
  public ResponseEntity<Void> removePause(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @PathVariable("pauseId") UUID pauseId) {
    habitService.removePause(userId, id, pauseId);
    return ResponseEntity.noContent().build();
  }

  // --- Validation helpers ---------------------------------------------------

  private static HabitCadence parseCadence(String cadence) {
    try {
      return HabitCadence.valueOf(cadence.toUpperCase());
    } catch (IllegalArgumentException exception) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("cadence", "INVALID")));
    }
  }

  private static void validateTimeZone(String timeZone) {
    try {
      ZoneId.of(timeZone);
    } catch (DateTimeException exception) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("timeZone", "INVALID")));
    }
  }

  private static void validateReminder(boolean reminderEnabled, java.time.LocalTime reminderTime) {
    if (reminderEnabled && reminderTime == null) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("reminderTime", "REQUIRED")));
    }
  }
}
