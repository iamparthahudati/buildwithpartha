package tech.buildwithpartha.lifeos.sprint.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.sprint.application.CreateWeeklyPlanCommand;
import tech.buildwithpartha.lifeos.sprint.application.UpdateWeeklyPlanCommand;
import tech.buildwithpartha.lifeos.sprint.application.WeeklyPlanCapacityInput;
import tech.buildwithpartha.lifeos.sprint.application.WeeklyPlanItemInput;
import tech.buildwithpartha.lifeos.sprint.application.WeeklyPlanOutcomeInput;
import tech.buildwithpartha.lifeos.sprint.application.WeeklyPlanService;

@RestController
@RequestMapping("/weekly-plans")
@SecurityRequirement(name = "sessionCookie")
public class WeeklyPlanController {
  private final WeeklyPlanService service;

  public WeeklyPlanController(WeeklyPlanService service) {
    this.service = service;
  }

  @Operation(summary = "List Weekly Plan revisions")
  @GetMapping
  public List<WeeklyPlanResponse> list(
      @AuthenticationPrincipal UUID userId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate weekDate) {
    return service.list(userId, weekDate).stream().map(WeeklyPlanResponse::fromView).toList();
  }

  @Operation(summary = "Start a Weekly Plan draft")
  @PostMapping
  public ResponseEntity<WeeklyPlanResponse> create(
      @AuthenticationPrincipal UUID userId, @Valid @RequestBody CreateWeeklyPlanRequest request) {
    var view =
        service.create(
            userId,
            new CreateWeeklyPlanCommand(
                request.weekDate(),
                request.capacities().stream().map(WeeklyPlanController::capacity).toList(),
                request.outcomes().stream().map(WeeklyPlanController::outcome).toList(),
                request.items().stream().map(WeeklyPlanController::item).toList()));
    return ResponseEntity.created(URI.create("/life-os/api/v1/weekly-plans/" + view.plan().id()))
        .body(WeeklyPlanResponse.fromView(view));
  }

  @GetMapping("/{id}")
  public WeeklyPlanResponse get(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
    return WeeklyPlanResponse.fromView(service.get(userId, id));
  }

  @PutMapping("/{id}")
  public WeeklyPlanResponse update(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateWeeklyPlanRequest request) {
    return WeeklyPlanResponse.fromView(
        service.update(
            userId,
            id,
            new UpdateWeeklyPlanCommand(
                request.capacities().stream().map(WeeklyPlanController::capacity).toList(),
                request.outcomes().stream().map(WeeklyPlanController::outcome).toList(),
                request.items().stream().map(WeeklyPlanController::item).toList(),
                request.version())));
  }

  @PostMapping("/{id}/finalize")
  public WeeklyPlanResponse finalizePlan(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID id,
      @Valid @RequestBody WeeklyPlanVersionRequest request) {
    return WeeklyPlanResponse.fromView(service.finalizePlan(userId, id, request.version()));
  }

  @PostMapping("/{id}/reopen")
  public ResponseEntity<WeeklyPlanResponse> reopen(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID id,
      @Valid @RequestBody WeeklyPlanVersionRequest request) {
    var view = service.reopen(userId, id, request.version());
    return ResponseEntity.created(URI.create("/life-os/api/v1/weekly-plans/" + view.plan().id()))
        .body(WeeklyPlanResponse.fromView(view));
  }

  private static WeeklyPlanCapacityInput capacity(WeeklyPlanCapacityRequest request) {
    return new WeeklyPlanCapacityInput(request.localDate(), request.availableMinutes());
  }

  private static WeeklyPlanOutcomeInput outcome(WeeklyPlanOutcomeRequest request) {
    return new WeeklyPlanOutcomeInput(
        Optional.ofNullable(request.id()), request.title(), request.position());
  }

  private static WeeklyPlanItemInput item(WeeklyPlanItemRequest request) {
    return new WeeklyPlanItemInput(
        Optional.ofNullable(request.id()),
        request.taskId(),
        Optional.ofNullable(request.outcomeId()),
        Optional.ofNullable(request.plannedDate()),
        request.plannedMinutes(),
        request.position());
  }
}
