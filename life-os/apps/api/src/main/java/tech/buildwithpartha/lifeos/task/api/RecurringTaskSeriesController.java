package tech.buildwithpartha.lifeos.task.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.task.application.CreateRecurringTaskSeriesCommand;
import tech.buildwithpartha.lifeos.task.application.RecurringTaskSeriesService;
import tech.buildwithpartha.lifeos.task.application.UpdateRecurringTaskSeriesCommand;
import tech.buildwithpartha.lifeos.task.domain.RecurrenceEditScope;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskException;
import tech.buildwithpartha.lifeos.task.domain.RecurringTaskSeries;

/** REST controller exposing endpoints for managing recurring task series. */
@RestController
@RequestMapping("/tasks/recurring-series")
@SecurityRequirement(name = "sessionCookie")
public class RecurringTaskSeriesController {

  private final RecurringTaskSeriesService seriesService;

  public RecurringTaskSeriesController(RecurringTaskSeriesService seriesService) {
    this.seriesService = seriesService;
  }

  @Operation(summary = "Create recurring task series")
  @ApiResponse(responseCode = "201", description = "Created series")
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public RecurringTaskSeriesResponse createSeries(
      @AuthenticationPrincipal UUID userId,
      @Valid @RequestBody CreateRecurringTaskSeriesRequest request) {

    CreateRecurringTaskSeriesCommand command =
        new CreateRecurringTaskSeriesCommand(
            request.title(),
            Optional.ofNullable(request.description()),
            request.priority() != null
                ? request.priority()
                : tech.buildwithpartha.lifeos.task.domain.TaskPriority.P3,
            Optional.ofNullable(request.projectId()),
            request.estimateMinutes(),
            request.frequency(),
            request.intervalValue() > 0 ? request.intervalValue() : 1,
            Optional.ofNullable(request.daysOfWeek()),
            Optional.ofNullable(request.dayOfMonth()),
            request.endMode(),
            Optional.ofNullable(request.endDate()),
            Optional.ofNullable(request.endCount()),
            request.startDate(),
            request.timeZone());

    RecurringTaskSeries created = seriesService.createSeries(userId, command);
    return RecurringTaskSeriesResponse.fromDomain(created);
  }

  @Operation(summary = "List active recurring task series")
  @GetMapping
  public List<RecurringTaskSeriesResponse> listSeries(@AuthenticationPrincipal UUID userId) {
    return seriesService.listSeries(userId).stream()
        .map(RecurringTaskSeriesResponse::fromDomain)
        .toList();
  }

  @Operation(summary = "Get recurring task series by ID")
  @GetMapping("/{id}")
  public RecurringTaskSeriesResponse getSeries(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID seriesId) {
    RecurringTaskSeries series = seriesService.getSeries(userId, seriesId);
    return RecurringTaskSeriesResponse.fromDomain(series);
  }

  @Operation(summary = "Update recurring task series with edit scope")
  @PutMapping("/{id}")
  public RecurringTaskSeriesResponse updateSeries(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID seriesId,
      @Valid @RequestBody UpdateRecurringTaskSeriesRequest request) {

    UpdateRecurringTaskSeriesCommand command =
        new UpdateRecurringTaskSeriesCommand(
            request.title(),
            Optional.ofNullable(request.description()),
            request.priority() != null
                ? request.priority()
                : tech.buildwithpartha.lifeos.task.domain.TaskPriority.P3,
            Optional.ofNullable(request.projectId()),
            request.estimateMinutes(),
            request.frequency(),
            request.intervalValue() > 0 ? request.intervalValue() : 1,
            Optional.ofNullable(request.daysOfWeek()),
            Optional.ofNullable(request.dayOfMonth()),
            request.endMode(),
            Optional.ofNullable(request.endDate()),
            Optional.ofNullable(request.endCount()),
            request.startDate(),
            request.timeZone());

    RecurrenceEditScope scope =
        request.scope() != null ? request.scope() : RecurrenceEditScope.SERIES;
    RecurringTaskSeries updated =
        seriesService.updateSeries(
            userId, seriesId, command, scope, Optional.ofNullable(request.occurrenceDate()));
    return RecurringTaskSeriesResponse.fromDomain(updated);
  }

  @Operation(summary = "Delete recurring task series")
  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteSeries(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID seriesId) {
    seriesService.deleteSeries(userId, seriesId);
  }

  @Operation(summary = "Skip specific occurrence")
  @PostMapping("/{id}/skip")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void skipOccurrence(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID seriesId,
      @Valid @RequestBody SkipOccurrenceRequest request) {
    seriesService.skipOccurrence(
        userId, seriesId, request.occurrenceDate(), Optional.ofNullable(request.reason()));
  }

  @Operation(summary = "Get exception records for series")
  @GetMapping("/{id}/exceptions")
  public List<RecurringTaskException> getExceptions(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID seriesId) {
    return seriesService.listExceptions(userId, seriesId);
  }
}
