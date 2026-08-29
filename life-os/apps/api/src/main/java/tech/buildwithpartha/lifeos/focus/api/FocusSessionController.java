package tech.buildwithpartha.lifeos.focus.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.net.URI;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.focus.application.FocusSessionService;
import tech.buildwithpartha.lifeos.focus.application.FocusSessionSnapshot;
import tech.buildwithpartha.lifeos.focus.application.StartFocusSessionCommand;

/** Authenticated Focus Session lifecycle and refresh-recovery API. */
@RestController
@RequestMapping("/focus-sessions")
@SecurityRequirement(name = "sessionCookie")
public class FocusSessionController {

  private final FocusSessionService service;

  public FocusSessionController(FocusSessionService service) {
    this.service = service;
  }

  @Operation(operationId = "getActiveFocusSession", summary = "Recover the active Focus Session")
  @ApiResponse(responseCode = "200", description = "Current active Focus Session.")
  @ApiResponse(responseCode = "204", description = "No active Focus Session.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @GetMapping("/active")
  public ResponseEntity<FocusSessionResponse> getActive(@AuthenticationPrincipal UUID userId) {
    return service
        .getActiveSession(userId)
        .map(FocusSessionResponse::fromSnapshot)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.noContent().build());
  }

  @Operation(operationId = "getFocusSession", summary = "Get a Focus Session")
  @ApiResponse(responseCode = "200", description = "User-owned Focus Session.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @GetMapping("/{sessionId}")
  public FocusSessionResponse get(
      @AuthenticationPrincipal UUID userId, @PathVariable UUID sessionId) {
    return FocusSessionResponse.fromSnapshot(service.getSession(userId, sessionId));
  }

  @Operation(operationId = "startFocusSession", summary = "Start a Focus Session")
  @SecurityRequirement(name = "csrfToken")
  @ApiResponse(responseCode = "201", description = "Focus Session started once.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @PostMapping
  public ResponseEntity<FocusSessionResponse> start(
      @AuthenticationPrincipal UUID userId,
      @Parameter(description = "Unique replay key retained for seven days.", required = true)
          @RequestHeader(name = "Idempotency-Key", required = false)
          String idempotencyKey,
      @Valid @RequestBody StartFocusSessionRequest request) {
    StartFocusSessionCommand command =
        new StartFocusSessionCommand(
            Optional.ofNullable(request.taskId()),
            Optional.ofNullable(request.timeBlockId()),
            Duration.ofSeconds(request.plannedFocusDurationSeconds()),
            Duration.ofSeconds(request.plannedBreakDurationSeconds()));
    FocusSessionSnapshot started = service.start(userId, command, idempotencyKey);
    URI location = URI.create("/life-os/api/v1/focus-sessions/" + started.session().id());
    return ResponseEntity.created(location).body(FocusSessionResponse.fromSnapshot(started));
  }

  @PostMapping("/{sessionId}/pause")
  @Operation(operationId = "pauseFocusSession", summary = "Pause a Focus Session")
  @SecurityRequirement(name = "csrfToken")
  @TransitionResponses
  public FocusSessionResponse pause(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID sessionId,
      @Parameter(description = "Unique replay key retained for seven days.", required = true)
          @RequestHeader(name = "Idempotency-Key", required = false)
          String idempotencyKey,
      @Valid @RequestBody FocusSessionTransitionRequest request) {
    return FocusSessionResponse.fromSnapshot(
        service.pause(userId, sessionId, request.version(), idempotencyKey));
  }

  @PostMapping("/{sessionId}/resume")
  @Operation(operationId = "resumeFocusSession", summary = "Resume a Focus Session")
  @SecurityRequirement(name = "csrfToken")
  @TransitionResponses
  public FocusSessionResponse resume(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID sessionId,
      @Parameter(description = "Unique replay key retained for seven days.", required = true)
          @RequestHeader(name = "Idempotency-Key", required = false)
          String idempotencyKey,
      @Valid @RequestBody FocusSessionTransitionRequest request) {
    return FocusSessionResponse.fromSnapshot(
        service.resume(userId, sessionId, request.version(), idempotencyKey));
  }

  @PostMapping("/{sessionId}/start-break")
  @Operation(operationId = "startFocusSessionBreak", summary = "Start the break phase")
  @SecurityRequirement(name = "csrfToken")
  @TransitionResponses
  public FocusSessionResponse startBreak(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID sessionId,
      @Parameter(description = "Unique replay key retained for seven days.", required = true)
          @RequestHeader(name = "Idempotency-Key", required = false)
          String idempotencyKey,
      @Valid @RequestBody FocusSessionTransitionRequest request) {
    return FocusSessionResponse.fromSnapshot(
        service.startBreak(userId, sessionId, request.version(), idempotencyKey));
  }

  @PostMapping("/{sessionId}/resume-focus")
  @Operation(operationId = "resumeFocusSessionFocus", summary = "Resume the focus phase")
  @SecurityRequirement(name = "csrfToken")
  @TransitionResponses
  public FocusSessionResponse resumeFocus(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID sessionId,
      @Parameter(description = "Unique replay key retained for seven days.", required = true)
          @RequestHeader(name = "Idempotency-Key", required = false)
          String idempotencyKey,
      @Valid @RequestBody FocusSessionTransitionRequest request) {
    return FocusSessionResponse.fromSnapshot(
        service.resumeFocus(userId, sessionId, request.version(), idempotencyKey));
  }

  @PostMapping("/{sessionId}/complete")
  @Operation(operationId = "completeFocusSession", summary = "Complete a Focus Session")
  @SecurityRequirement(name = "csrfToken")
  @TransitionResponses
  public FocusSessionResponse complete(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID sessionId,
      @Parameter(description = "Unique replay key retained for seven days.", required = true)
          @RequestHeader(name = "Idempotency-Key", required = false)
          String idempotencyKey,
      @Valid @RequestBody FocusSessionTransitionRequest request) {
    return FocusSessionResponse.fromSnapshot(
        service.complete(userId, sessionId, request.version(), idempotencyKey));
  }

  @PostMapping("/{sessionId}/cancel")
  @Operation(operationId = "cancelFocusSession", summary = "Cancel a Focus Session")
  @SecurityRequirement(name = "csrfToken")
  @TransitionResponses
  public FocusSessionResponse cancel(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID sessionId,
      @Parameter(description = "Unique replay key retained for seven days.", required = true)
          @RequestHeader(name = "Idempotency-Key", required = false)
          String idempotencyKey,
      @Valid @RequestBody FocusSessionTransitionRequest request) {
    return FocusSessionResponse.fromSnapshot(
        service.cancel(userId, sessionId, request.version(), idempotencyKey));
  }

  @PostMapping("/{sessionId}/interruptions")
  @Operation(operationId = "recordFocusSessionInterruption", summary = "Record an interruption")
  @SecurityRequirement(name = "csrfToken")
  @TransitionResponses
  public FocusSessionResponse recordInterruption(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID sessionId,
      @Parameter(description = "Unique replay key retained for seven days.", required = true)
          @RequestHeader(name = "Idempotency-Key", required = false)
          String idempotencyKey,
      @Valid @RequestBody RecordFocusInterruptionRequest request) {
    return FocusSessionResponse.fromSnapshot(
        service.recordInterruption(
            userId, sessionId, request.version(), request.note(), idempotencyKey));
  }

  @ApiResponse(responseCode = "200", description = "Canonical Focus Session state.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @Target(ElementType.METHOD)
  @Retention(RetentionPolicy.RUNTIME)
  @Documented
  private @interface TransitionResponses {}
}
