package tech.buildwithpartha.lifeos.project.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.project.application.CreateMilestoneCommand;
import tech.buildwithpartha.lifeos.project.application.MilestoneService;
import tech.buildwithpartha.lifeos.project.application.UpdateMilestoneCommand;
import tech.buildwithpartha.lifeos.project.domain.Milestone;
import tech.buildwithpartha.lifeos.project.domain.MilestoneStatus;

/** Controller exposing REST endpoints for managing Milestones (LOS-0704). */
@RestController
@RequestMapping("/projects/{projectId}/milestones")
@SecurityRequirement(name = "sessionCookie")
public class MilestoneController {

  private final MilestoneService milestoneService;

  public MilestoneController(MilestoneService milestoneService) {
    this.milestoneService = milestoneService;
  }

  @Operation(
      summary = "Get project milestones",
      description = "Retrieves all milestones for a project.")
  @ApiResponse(responseCode = "200", description = "List of milestones.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping
  public List<MilestoneResponse> getMilestones(
      @AuthenticationPrincipal UUID userId, @PathVariable("projectId") UUID projectId) {
    List<Milestone> milestones = milestoneService.getMilestones(userId, projectId);
    return milestones.stream().map(MilestoneResponse::fromDomain).toList();
  }

  @Operation(summary = "Create milestone", description = "Creates a new milestone in a project.")
  @ApiResponse(responseCode = "200", description = "Milestone created successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping
  public MilestoneResponse createMilestone(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("projectId") UUID projectId,
      @Valid @RequestBody CreateMilestoneRequest request) {

    MilestoneStatus status = parseStatus(request.status());
    int ordering = request.ordering() != null ? request.ordering() : 0;

    Milestone created =
        milestoneService.createMilestone(
            userId,
            projectId,
            new CreateMilestoneCommand(request.title(), request.date(), status, ordering));

    return MilestoneResponse.fromDomain(created);
  }

  @Operation(
      summary = "Update milestone",
      description = "Updates an existing milestone. Checks optimistic lock version.")
  @ApiResponse(responseCode = "200", description = "Milestone updated successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PutMapping("/{milestoneId}")
  public MilestoneResponse updateMilestone(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("projectId") UUID projectId,
      @PathVariable("milestoneId") UUID milestoneId,
      @Valid @RequestBody UpdateMilestoneRequest request) {

    MilestoneStatus status = parseStatus(request.status());

    Milestone updated =
        milestoneService.updateMilestone(
            userId,
            projectId,
            milestoneId,
            new UpdateMilestoneCommand(
                request.title(), request.date(), status, request.ordering(), request.version()));

    return MilestoneResponse.fromDomain(updated);
  }

  @Operation(
      summary = "Update milestone status",
      description =
          "Updates only the status of an existing milestone. Checks optimistic lock version.")
  @ApiResponse(responseCode = "200", description = "Milestone status updated successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PutMapping("/{milestoneId}/status")
  public MilestoneResponse updateMilestoneStatus(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("projectId") UUID projectId,
      @PathVariable("milestoneId") UUID milestoneId,
      @Valid @RequestBody UpdateMilestoneStatusRequest request) {

    MilestoneStatus status = parseStatus(request.status());

    Milestone updated =
        milestoneService.updateMilestoneStatus(
            userId, projectId, milestoneId, status, request.version());

    return MilestoneResponse.fromDomain(updated);
  }

  @Operation(summary = "Delete milestone", description = "Permanently deletes a milestone.")
  @ApiResponse(responseCode = "204", description = "Milestone deleted successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @DeleteMapping("/{milestoneId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public ResponseEntity<Void> deleteMilestone(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("projectId") UUID projectId,
      @PathVariable("milestoneId") UUID milestoneId) {

    milestoneService.deleteMilestone(userId, projectId, milestoneId);
    return ResponseEntity.noContent().build();
  }

  private MilestoneStatus parseStatus(String value) {
    if (value == null) {
      return MilestoneStatus.PLANNED;
    }
    try {
      return MilestoneStatus.valueOf(value.toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("status", "INVALID")));
    }
  }
}
