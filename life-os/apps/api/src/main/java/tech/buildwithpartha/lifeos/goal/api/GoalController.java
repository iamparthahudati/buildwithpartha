package tech.buildwithpartha.lifeos.goal.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;
import tech.buildwithpartha.lifeos.goal.application.AddCheckInCommand;
import tech.buildwithpartha.lifeos.goal.application.AddGoalLinkCommand;
import tech.buildwithpartha.lifeos.goal.application.CreateGoalCommand;
import tech.buildwithpartha.lifeos.goal.application.GoalDetailResult;
import tech.buildwithpartha.lifeos.goal.application.GoalService;
import tech.buildwithpartha.lifeos.goal.application.UpdateGoalCommand;
import tech.buildwithpartha.lifeos.goal.domain.CheckInCadence;
import tech.buildwithpartha.lifeos.goal.domain.Goal;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckIn;
import tech.buildwithpartha.lifeos.goal.domain.GoalLink;
import tech.buildwithpartha.lifeos.goal.domain.GoalProgressType;
import tech.buildwithpartha.lifeos.goal.domain.GoalQuery;
import tech.buildwithpartha.lifeos.goal.domain.GoalQueryResult;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;
import tech.buildwithpartha.lifeos.goal.domain.GoalSummaryCounts;

/** REST controller exposing Goals management endpoints (LOS-1102). */
@RestController
@RequestMapping("/goals")
@SecurityRequirement(name = "sessionCookie")
public class GoalController {

  private static final Set<String> ALLOWED_SORT_FIELDS =
      Set.of("title", "category", "status", "progressType", "targetDate", "createdAt", "updatedAt");

  private final GoalService goalService;

  public GoalController(GoalService goalService) {
    this.goalService = goalService;
  }

  @Operation(summary = "Query goals", description = "Search, filter, and paginate user goals.")
  @ApiResponse(responseCode = "200", description = "Query results.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping
  public GoalQueryResponse queryGoals(
      @AuthenticationPrincipal UUID userId,
      @RequestParam(name = "q", required = false) String q,
      @RequestParam(name = "status", required = false) Set<String> statusStrings,
      @RequestParam(name = "category", required = false) String category,
      @RequestParam(name = "progressType", required = false) Set<String> progressTypeStrings,
      @RequestParam(name = "archived", required = false) Boolean archived,
      @RequestParam(name = "page", required = false, defaultValue = "0") int page,
      @RequestParam(name = "size", required = false, defaultValue = "20") int size,
      @RequestParam(name = "sortBy", required = false, defaultValue = "updatedAt") String sortBy,
      @RequestParam(name = "sortDirection", required = false, defaultValue = "DESC")
          String sortDirection) {

    if (page < 0) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("page", "INVALID")));
    }
    if (size < 1 || size > 100) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("size", "INVALID")));
    }
    if (!ALLOWED_SORT_FIELDS.contains(sortBy)) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("sortBy", "INVALID")));
    }
    if (!"ASC".equalsIgnoreCase(sortDirection) && !"DESC".equalsIgnoreCase(sortDirection)) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("sortDirection", "INVALID")));
    }

    Set<GoalStatus> statuses = parseStatuses(statusStrings);
    Set<GoalProgressType> progressTypes = parseProgressTypes(progressTypeStrings);

    GoalQuery query =
        new GoalQuery(
            userId,
            q,
            statuses,
            category,
            progressTypes,
            archived,
            page,
            size,
            sortBy,
            sortDirection);

    GoalQueryResult queryResult = goalService.queryGoals(query);
    GoalSummaryCounts summary = goalService.getSummaryCounts(userId);

    List<GoalResponse> items = queryResult.goals().stream().map(GoalResponse::fromDomain).toList();
    PageResponse<GoalResponse> pageResponse =
        PageResponse.of(items, page, size, queryResult.totalItems());

    return new GoalQueryResponse(pageResponse, GoalSummaryCountsResponse.fromDomain(summary));
  }

  @Operation(summary = "Create goal", description = "Creates a new user-owned Goal aggregate.")
  @ApiResponse(responseCode = "201", description = "Goal created successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping
  public ResponseEntity<GoalResponse> createGoal(
      @AuthenticationPrincipal UUID userId, @Valid @RequestBody CreateGoalRequest request) {

    GoalProgressType progressType =
        request.progressType() != null ? request.progressType() : GoalProgressType.PERCENTAGE;
    GoalStatus status = request.status() != null ? request.status() : GoalStatus.NOT_STARTED;
    CheckInCadence cadence =
        request.checkInCadence() != null ? request.checkInCadence() : CheckInCadence.NONE;
    BigDecimal currentValue =
        request.currentValue() != null ? request.currentValue() : BigDecimal.ZERO;

    CreateGoalCommand command =
        new CreateGoalCommand(
            request.title(),
            Optional.ofNullable(request.description()),
            request.category(),
            progressType,
            Optional.ofNullable(request.targetValue()),
            currentValue,
            Optional.ofNullable(request.unit()),
            Optional.ofNullable(request.targetDate()),
            status,
            cadence);

    Goal created = goalService.createGoal(userId, command);
    GoalResponse response = GoalResponse.fromDomain(created);
    URI location = URI.create("/life-os/api/v1/goals/" + created.id());
    return ResponseEntity.created(location).body(response);
  }

  @Operation(summary = "Get goal", description = "Retrieves an existing goal by ID.")
  @ApiResponse(responseCode = "200", description = "Goal details.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/{id}")
  public GoalResponse getGoal(@AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    Goal goal = goalService.getGoal(userId, id);
    return GoalResponse.fromDomain(goal);
  }

  @Operation(summary = "Get goal detail", description = "Retrieves aggregated goal details.")
  @ApiResponse(responseCode = "200", description = "Goal detail aggregate.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/{id}/detail")
  public GoalDetailResponse getGoalDetail(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    GoalDetailResult result = goalService.getGoalDetail(userId, id);
    return GoalDetailResponse.fromApplication(result);
  }

  @Operation(summary = "Update goal", description = "Updates an existing goal aggregate.")
  @ApiResponse(responseCode = "200", description = "Goal updated successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PutMapping("/{id}")
  public GoalResponse updateGoal(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody UpdateGoalRequest request) {

    GoalProgressType progressType =
        request.progressType() != null ? request.progressType() : GoalProgressType.PERCENTAGE;
    CheckInCadence cadence =
        request.checkInCadence() != null ? request.checkInCadence() : CheckInCadence.NONE;
    BigDecimal currentValue =
        request.currentValue() != null ? request.currentValue() : BigDecimal.ZERO;

    UpdateGoalCommand command =
        new UpdateGoalCommand(
            request.title(),
            Optional.ofNullable(request.description()),
            request.category(),
            progressType,
            Optional.ofNullable(request.targetValue()),
            currentValue,
            Optional.ofNullable(request.unit()),
            Optional.ofNullable(request.targetDate()),
            cadence,
            request.version());

    Goal updated = goalService.updateGoal(userId, id, command);
    return GoalResponse.fromDomain(updated);
  }

  @Operation(summary = "Pause goal", description = "Pauses an active goal.")
  @ApiResponse(responseCode = "200", description = "Goal paused successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/pause")
  public GoalResponse pauseGoal(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody PauseGoalRequest request) {
    Goal paused = goalService.pauseGoal(userId, id, request.version());
    return GoalResponse.fromDomain(paused);
  }

  @Operation(summary = "Complete goal", description = "Marks a goal completed.")
  @ApiResponse(responseCode = "200", description = "Goal completed successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/complete")
  public GoalResponse completeGoal(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody CompleteGoalRequest request) {
    Goal completed = goalService.completeGoal(userId, id, request.version());
    return GoalResponse.fromDomain(completed);
  }

  @Operation(summary = "Archive goal", description = "Archives a goal.")
  @ApiResponse(responseCode = "200", description = "Goal archived successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/archive")
  public GoalResponse archiveGoal(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody ArchiveGoalRequest request) {
    Goal archived = goalService.archiveGoal(userId, id, request.version());
    return GoalResponse.fromDomain(archived);
  }

  @Operation(summary = "Restore goal", description = "Restores an archived goal.")
  @ApiResponse(responseCode = "200", description = "Goal restored successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/restore")
  public GoalResponse restoreGoal(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody RestoreGoalRequest request) {
    Goal restored = goalService.restoreGoal(userId, id, request.version());
    return GoalResponse.fromDomain(restored);
  }

  @Operation(summary = "Delete goal", description = "Permanently deletes a goal.")
  @ApiResponse(responseCode = "204", description = "Goal deleted successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public ResponseEntity<Void> deleteGoal(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    goalService.deleteGoal(userId, id);
    return ResponseEntity.noContent().build();
  }

  // --- Check-in endpoints ---

  @Operation(summary = "Record goal check-in", description = "Records a new progress check-in.")
  @ApiResponse(responseCode = "201", description = "Check-in recorded successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{goalId}/check-ins")
  public ResponseEntity<GoalCheckInResponse> recordCheckIn(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("goalId") UUID goalId,
      @Valid @RequestBody AddCheckInRequest request) {

    AddCheckInCommand command =
        new AddCheckInCommand(
            request.value(),
            Optional.ofNullable(request.note()),
            Optional.ofNullable(request.recordedAt()));

    GoalCheckIn checkIn = goalService.addCheckIn(userId, goalId, command);
    GoalCheckInResponse response = GoalCheckInResponse.fromDomain(checkIn);
    URI location = URI.create("/life-os/api/v1/goals/" + goalId + "/check-ins/" + checkIn.id());
    return ResponseEntity.created(location).body(response);
  }

  @Operation(summary = "List goal check-ins", description = "Lists paginated check-ins for a goal.")
  @ApiResponse(responseCode = "200", description = "Check-ins page.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/{goalId}/check-ins")
  public PageResponse<GoalCheckInResponse> listCheckIns(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("goalId") UUID goalId,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "size", defaultValue = "20") int size) {

    if (page < 0) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("page", "INVALID")));
    }
    if (size < 1 || size > 100) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("size", "INVALID")));
    }

    PageResponse<GoalCheckIn> pageResult = goalService.getCheckIns(userId, goalId, page, size);
    List<GoalCheckInResponse> items =
        pageResult.items().stream().map(GoalCheckInResponse::fromDomain).toList();
    return PageResponse.of(items, pageResult.page(), pageResult.size(), pageResult.totalItems());
  }

  @Operation(summary = "Delete goal check-in", description = "Deletes a progress check-in.")
  @ApiResponse(responseCode = "204", description = "Check-in deleted successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @DeleteMapping("/{goalId}/check-ins/{checkInId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public ResponseEntity<Void> deleteCheckIn(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("goalId") UUID goalId,
      @PathVariable("checkInId") UUID checkInId) {
    goalService.deleteCheckIn(userId, goalId, checkInId);
    return ResponseEntity.noContent().build();
  }

  // --- Link endpoints ---

  @Operation(summary = "Add goal link", description = "Links a goal to a project, task, or habit.")
  @ApiResponse(responseCode = "201", description = "Link created successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{goalId}/links")
  public ResponseEntity<GoalLinkResponse> addLink(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("goalId") UUID goalId,
      @Valid @RequestBody AddGoalLinkRequest request) {

    AddGoalLinkCommand command = new AddGoalLinkCommand(request.targetType(), request.targetId());
    GoalLink link = goalService.addLink(userId, goalId, command);
    GoalLinkResponse response = GoalLinkResponse.fromDomain(link);
    URI location = URI.create("/life-os/api/v1/goals/" + goalId + "/links/" + link.id());
    return ResponseEntity.created(location).body(response);
  }

  @Operation(summary = "List goal links", description = "Lists target links for a goal.")
  @ApiResponse(responseCode = "200", description = "Goal links list.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/{goalId}/links")
  public List<GoalLinkResponse> listLinks(
      @AuthenticationPrincipal UUID userId, @PathVariable("goalId") UUID goalId) {
    return goalService.getLinks(userId, goalId).stream().map(GoalLinkResponse::fromDomain).toList();
  }

  @Operation(summary = "Delete goal link", description = "Removes a goal target link.")
  @ApiResponse(responseCode = "204", description = "Link deleted successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @DeleteMapping("/{goalId}/links/{linkId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public ResponseEntity<Void> deleteLink(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("goalId") UUID goalId,
      @PathVariable("linkId") UUID linkId) {
    goalService.deleteLink(userId, goalId, linkId);
    return ResponseEntity.noContent().build();
  }

  // --- Activity endpoint ---

  private Set<GoalStatus> parseStatuses(Set<String> values) {
    if (values == null || values.isEmpty()) {
      return Set.of();
    }
    Set<GoalStatus> result = new HashSet<>();
    for (String val : values) {
      try {
        result.add(GoalStatus.valueOf(val.toUpperCase()));
      } catch (IllegalArgumentException e) {
        throw new FieldValidationException(
            "Validation failed", List.of(new FieldProblem("status", "INVALID")));
      }
    }
    return result;
  }

  private Set<GoalProgressType> parseProgressTypes(Set<String> values) {
    if (values == null || values.isEmpty()) {
      return Set.of();
    }
    Set<GoalProgressType> result = new HashSet<>();
    for (String val : values) {
      try {
        result.add(GoalProgressType.valueOf(val.toUpperCase()));
      } catch (IllegalArgumentException e) {
        throw new FieldValidationException(
            "Validation failed", List.of(new FieldProblem("progressType", "INVALID")));
      }
    }
    return result;
  }
}
