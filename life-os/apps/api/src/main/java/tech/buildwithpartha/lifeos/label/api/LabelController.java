package tech.buildwithpartha.lifeos.label.api;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.label.application.CreateLabelCommand;
import tech.buildwithpartha.lifeos.label.application.LabelService;
import tech.buildwithpartha.lifeos.label.application.UpdateLabelCommand;
import tech.buildwithpartha.lifeos.label.domain.Label;

@RestController
@RequestMapping("/labels")
@SecurityRequirement(name = "sessionCookie")
public class LabelController {

  private final LabelService labelService;

  public LabelController(LabelService labelService) {
    this.labelService = labelService;
  }

  @Operation(
      summary = "Create label",
      description = "Creates a new user-defined classification label.")
  @ApiResponse(responseCode = "201", description = "Label created successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public LabelResponse createLabel(
      @AuthenticationPrincipal UUID userId, @Valid @RequestBody CreateLabelRequest request) {
    CreateLabelCommand command = new CreateLabelCommand(request.name(), request.color());
    Label label = labelService.createLabel(userId, command);
    return LabelResponse.fromDomain(label);
  }

  @Operation(
      summary = "Get user labels",
      description = "Retrieves all labels owned by the current user.")
  @ApiResponse(responseCode = "200", description = "List of labels.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping
  public List<LabelResponse> getLabels(@AuthenticationPrincipal UUID userId) {
    return labelService.getLabels(userId).stream().map(LabelResponse::fromDomain).toList();
  }

  @Operation(summary = "Get label by ID", description = "Retrieves a specific label by its ID.")
  @ApiResponse(responseCode = "200", description = "Label details.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/{id}")
  public LabelResponse getLabelById(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    Label label = labelService.getLabelById(userId, id);
    return LabelResponse.fromDomain(label);
  }

  @Operation(summary = "Update label", description = "Updates a label's name and/or color.")
  @ApiResponse(responseCode = "200", description = "Label updated successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PutMapping("/{id}")
  public LabelResponse updateLabel(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody UpdateLabelRequest request) {
    UpdateLabelCommand command =
        new UpdateLabelCommand(request.name(), request.color(), request.version());
    Label label = labelService.updateLabel(userId, id, command);
    return LabelResponse.fromDomain(label);
  }

  @Operation(summary = "Delete label", description = "Deletes a label with optional replacement.")
  @ApiResponse(responseCode = "204", description = "Label deleted successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteLabel(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @RequestParam(name = "replaceWithLabelId", required = false) UUID replaceWithLabelId) {
    labelService.deleteLabel(userId, id, Optional.ofNullable(replaceWithLabelId));
  }
}
