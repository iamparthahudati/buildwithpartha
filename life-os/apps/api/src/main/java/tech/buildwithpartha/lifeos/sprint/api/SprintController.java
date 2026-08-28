package tech.buildwithpartha.lifeos.sprint.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
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
import tech.buildwithpartha.lifeos.sprint.application.CompleteSprintCommand;
import tech.buildwithpartha.lifeos.sprint.application.CreateSprintCommand;
import tech.buildwithpartha.lifeos.sprint.application.SprintService;
import tech.buildwithpartha.lifeos.sprint.application.SprintTaskInput;
import tech.buildwithpartha.lifeos.sprint.application.UpdateSprintCommand;
import tech.buildwithpartha.lifeos.sprint.domain.SprintStatus;

@RestController
@RequestMapping("/sprints")
@SecurityRequirement(name = "sessionCookie")
public class SprintController {
  private final SprintService service;

  public SprintController(SprintService service) {
    this.service = service;
  }

  @Operation(summary = "List Sprints")
  @GetMapping
  public List<SprintResponse> list(
      @AuthenticationPrincipal UUID userId,
      @RequestParam(name = "status", required = false) String statuses) {
    Set<SprintStatus> parsed = parseStatuses(statuses);
    return service.list(userId, parsed).stream().map(SprintResponse::fromDomain).toList();
  }

  @Operation(summary = "Create a planned Sprint")
  @PostMapping
  public ResponseEntity<SprintResponse> create(
      @AuthenticationPrincipal UUID userId, @Valid @RequestBody CreateSprintRequest request) {
    var sprint =
        service.create(
            userId,
            new CreateSprintCommand(
                request.name(),
                Optional.ofNullable(request.goal()),
                request.startDate(),
                request.endDate(),
                request.targetCapacityPoints(),
                request.tasks().stream().map(SprintController::input).toList()));
    return ResponseEntity.created(URI.create("/life-os/api/v1/sprints/" + sprint.id()))
        .body(SprintResponse.fromDomain(sprint));
  }

  @GetMapping("/{id}")
  public SprintResponse get(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
    return SprintResponse.fromDomain(service.get(userId, id));
  }

  @PutMapping("/{id}")
  public SprintResponse update(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateSprintRequest request) {
    return SprintResponse.fromDomain(
        service.update(
            userId,
            id,
            new UpdateSprintCommand(
                request.name(),
                Optional.ofNullable(request.goal()),
                request.startDate(),
                request.endDate(),
                request.targetCapacityPoints(),
                request.version())));
  }

  @PostMapping("/{id}/tasks")
  public SprintResponse addTask(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID id,
      @Valid @RequestBody AddSprintTaskRequest request) {
    return SprintResponse.fromDomain(
        service.addTask(
            userId,
            id,
            new SprintTaskInput(request.taskId(), request.storyPoints(), request.position()),
            request.reason(),
            request.version()));
  }

  @PutMapping("/{id}/tasks/{taskId}")
  public SprintResponse updateTask(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID id,
      @PathVariable UUID taskId,
      @Valid @RequestBody SprintTaskMutationRequest request) {
    return SprintResponse.fromDomain(
        service.updateTask(
            userId,
            id,
            taskId,
            request.storyPoints(),
            request.position(),
            request.reason(),
            request.version()));
  }

  @PostMapping("/{id}/tasks/{taskId}/remove")
  public SprintResponse removeTask(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID id,
      @PathVariable UUID taskId,
      @Valid @RequestBody RemoveSprintTaskRequest request) {
    return SprintResponse.fromDomain(
        service.removeTask(userId, id, taskId, request.reason(), request.version()));
  }

  @PostMapping("/{id}/start")
  public SprintResponse start(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID id,
      @Valid @RequestBody SprintVersionRequest request) {
    return SprintResponse.fromDomain(service.start(userId, id, request.version()));
  }

  @PostMapping("/{id}/complete")
  public SprintResponse complete(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID id,
      @Valid @RequestBody CompleteSprintRequest request) {
    return SprintResponse.fromDomain(
        service.complete(
            userId,
            id,
            new CompleteSprintCommand(
                Optional.ofNullable(request.retrospectiveNotes()),
                Optional.ofNullable(request.whatWentWell()),
                Optional.ofNullable(request.whatCouldBeImproved()),
                request.actionItems(),
                request.carryOverDestination(),
                Optional.ofNullable(request.targetSprintId()),
                Optional.ofNullable(request.targetVersion()),
                request.version())));
  }

  @PostMapping("/{id}/cancel")
  public SprintResponse cancel(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID id,
      @Valid @RequestBody SprintVersionRequest request) {
    return SprintResponse.fromDomain(service.cancel(userId, id, request.version()));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @AuthenticationPrincipal UUID userId, @PathVariable UUID id, @RequestParam long version) {
    service.delete(userId, id, version);
    return ResponseEntity.noContent().build();
  }

  private static SprintTaskInput input(SprintTaskRequest request) {
    return new SprintTaskInput(request.taskId(), request.storyPoints(), request.position());
  }

  private static Set<SprintStatus> parseStatuses(String statuses) {
    if (statuses == null || statuses.isBlank()) {
      return Set.of();
    }
    try {
      return Arrays.stream(statuses.split(","))
          .map(String::trim)
          .map(String::toUpperCase)
          .map(SprintStatus::valueOf)
          .collect(Collectors.toUnmodifiableSet());
    } catch (IllegalArgumentException exception) {
      throw new FieldValidationException(
          "Invalid Sprint status", List.of(new FieldProblem("status", "INVALID")));
    }
  }
}
