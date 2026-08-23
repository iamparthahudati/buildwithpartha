package tech.buildwithpartha.lifeos.timeblock.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.timeblock.application.ChangeTimeBlockStatusCommand;
import tech.buildwithpartha.lifeos.timeblock.application.CreateTimeBlockCommand;
import tech.buildwithpartha.lifeos.timeblock.application.DuplicateTimeBlockCommand;
import tech.buildwithpartha.lifeos.timeblock.application.MoveTimeBlockCommand;
import tech.buildwithpartha.lifeos.timeblock.application.OverlapCheckResult;
import tech.buildwithpartha.lifeos.timeblock.application.ResizeTimeBlockCommand;
import tech.buildwithpartha.lifeos.timeblock.application.TimeBlockQuery;
import tech.buildwithpartha.lifeos.timeblock.application.TimeBlockService;
import tech.buildwithpartha.lifeos.timeblock.application.UpdateTimeBlockCommand;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

/** REST controller exposing Time Block CRUD, overlap resolution, and movement APIs. */
@RestController
@RequestMapping("/time-blocks")
@SecurityRequirement(name = "sessionCookie")
public class TimeBlockController {

  private final TimeBlockService timeBlockService;

  public TimeBlockController(TimeBlockService timeBlockService) {
    this.timeBlockService = timeBlockService;
  }

  @Operation(
      summary = "Query time blocks",
      description = "Query time blocks by range, day/week, project, or task.")
  @ApiResponse(responseCode = "200", description = "Query results.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @GetMapping
  public TimeBlockQueryResponse queryTimeBlocks(
      @AuthenticationPrincipal UUID userId,
      @RequestParam(name = "rangeStart", required = false) Instant rangeStart,
      @RequestParam(name = "rangeEnd", required = false) Instant rangeEnd,
      @RequestParam(name = "date", required = false) LocalDate date,
      @RequestParam(name = "timeZone", required = false) String timeZone,
      @RequestParam(name = "projectId", required = false) UUID projectId,
      @RequestParam(name = "taskId", required = false) UUID taskId) {

    TimeBlockQuery query =
        new TimeBlockQuery(
            userId,
            Optional.ofNullable(rangeStart),
            Optional.ofNullable(rangeEnd),
            Optional.ofNullable(date),
            Optional.ofNullable(timeZone),
            Optional.ofNullable(projectId),
            Optional.ofNullable(taskId));

    List<TimeBlock> domainBlocks = timeBlockService.queryTimeBlocks(query);
    return TimeBlockQueryResponse.fromDomain(domainBlocks);
  }

  @Operation(summary = "Get time block by ID", description = "Retrieve a single time block by ID.")
  @ApiResponse(responseCode = "200", description = "Time block found.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @GetMapping("/{id}")
  public TimeBlockResponse getTimeBlock(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    TimeBlock domainBlock = timeBlockService.getTimeBlock(userId, id);
    return TimeBlockResponse.fromDomain(domainBlock);
  }

  @Operation(
      summary = "Create time block",
      description = "Create a new time block with overlap check.")
  @ApiResponse(responseCode = "201", description = "Time block created.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @PostMapping
  public ResponseEntity<TimeBlockResponse> createTimeBlock(
      @AuthenticationPrincipal UUID userId, @Valid @RequestBody CreateTimeBlockRequest request) {

    CreateTimeBlockCommand command =
        new CreateTimeBlockCommand(
            request.title(),
            request.category(),
            request.status(),
            request.startAt(),
            request.endAt(),
            request.sourceTimeZone(),
            Optional.ofNullable(request.notes()),
            Optional.ofNullable(request.projectId()),
            Optional.ofNullable(request.taskId()),
            Boolean.TRUE.equals(request.allowOverlap()));

    TimeBlock created = timeBlockService.createTimeBlock(userId, command);
    return ResponseEntity.status(HttpStatus.CREATED).body(TimeBlockResponse.fromDomain(created));
  }

  @Operation(summary = "Update time block", description = "Update an existing time block.")
  @ApiResponse(responseCode = "200", description = "Time block updated.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @PutMapping("/{id}")
  public TimeBlockResponse updateTimeBlock(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody UpdateTimeBlockRequest request) {

    UpdateTimeBlockCommand command =
        new UpdateTimeBlockCommand(
            request.title(),
            request.category(),
            request.status(),
            request.startAt(),
            request.endAt(),
            request.sourceTimeZone(),
            Optional.ofNullable(request.notes()),
            Optional.ofNullable(request.projectId()),
            Optional.ofNullable(request.taskId()),
            request.version(),
            Boolean.TRUE.equals(request.allowOverlap()));

    TimeBlock updated = timeBlockService.updateTimeBlock(userId, id, command);
    return TimeBlockResponse.fromDomain(updated);
  }

  @Operation(summary = "Move time block", description = "Move time block start and end times.")
  @ApiResponse(responseCode = "200", description = "Time block moved.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @PatchMapping("/{id}/move")
  public TimeBlockResponse moveTimeBlock(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody MoveTimeBlockRequest request) {

    MoveTimeBlockCommand command =
        new MoveTimeBlockCommand(
            request.startAt(),
            request.endAt(),
            request.version(),
            Boolean.TRUE.equals(request.allowOverlap()));

    TimeBlock moved = timeBlockService.moveTimeBlock(userId, id, command);
    return TimeBlockResponse.fromDomain(moved);
  }

  @Operation(summary = "Resize time block", description = "Resize time block duration or bounds.")
  @ApiResponse(responseCode = "200", description = "Time block resized.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @PatchMapping("/{id}/resize")
  public TimeBlockResponse resizeTimeBlock(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody ResizeTimeBlockRequest request) {

    ResizeTimeBlockCommand command =
        new ResizeTimeBlockCommand(
            request.startAt(),
            request.endAt(),
            request.version(),
            Boolean.TRUE.equals(request.allowOverlap()));

    TimeBlock resized = timeBlockService.resizeTimeBlock(userId, id, command);
    return TimeBlockResponse.fromDomain(resized);
  }

  @Operation(summary = "Change time block status", description = "Update time block status.")
  @ApiResponse(responseCode = "200", description = "Status updated.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @PatchMapping("/{id}/status")
  public TimeBlockResponse changeStatus(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody ChangeTimeBlockStatusRequest request) {

    ChangeTimeBlockStatusCommand command =
        new ChangeTimeBlockStatusCommand(request.status(), Optional.ofNullable(request.version()));

    TimeBlock statusChanged = timeBlockService.changeStatus(userId, id, command);
    return TimeBlockResponse.fromDomain(statusChanged);
  }

  @Operation(summary = "Complete time block", description = "Mark time block as COMPLETED.")
  @ApiResponse(responseCode = "200", description = "Time block completed.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @PostMapping("/{id}/complete")
  public TimeBlockResponse completeTimeBlock(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @RequestParam(name = "version", required = false) Long version) {

    ChangeTimeBlockStatusCommand command =
        new ChangeTimeBlockStatusCommand(TimeBlockStatus.COMPLETED, Optional.ofNullable(version));

    TimeBlock completed = timeBlockService.changeStatus(userId, id, command);
    return TimeBlockResponse.fromDomain(completed);
  }

  @Operation(summary = "Duplicate time block", description = "Duplicate an existing time block.")
  @ApiResponse(responseCode = "201", description = "Time block duplicated.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @PostMapping("/{id}/duplicate")
  public ResponseEntity<TimeBlockResponse> duplicateTimeBlock(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @RequestBody(required = false) DuplicateTimeBlockRequest request) {

    DuplicateTimeBlockRequest req =
        request == null ? new DuplicateTimeBlockRequest(null, null, false) : request;

    DuplicateTimeBlockCommand command =
        new DuplicateTimeBlockCommand(
            Optional.ofNullable(req.startAt()),
            Optional.ofNullable(req.endAt()),
            Boolean.TRUE.equals(req.allowOverlap()));

    TimeBlock duplicated = timeBlockService.duplicateTimeBlock(userId, id, command);
    return ResponseEntity.status(HttpStatus.CREATED).body(TimeBlockResponse.fromDomain(duplicated));
  }

  @Operation(summary = "Delete time block", description = "Delete a time block by ID.")
  @ApiResponse(responseCode = "204", description = "Time block deleted.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteTimeBlock(@AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    timeBlockService.deleteTimeBlock(userId, id);
  }

  @Operation(
      summary = "Check overlap preflight",
      description = "Preflight check for overlapping time blocks.")
  @ApiResponse(responseCode = "200", description = "Overlap check completed.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @PostMapping("/check-overlap")
  public TimeBlockOverlapResponse checkOverlap(
      @AuthenticationPrincipal UUID userId, @Valid @RequestBody CheckOverlapRequest request) {

    OverlapCheckResult result =
        timeBlockService.checkOverlap(
            userId, request.startAt(), request.endAt(), Optional.ofNullable(request.excludeId()));

    return TimeBlockOverlapResponse.fromResult(result);
  }
}
