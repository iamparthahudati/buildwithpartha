package tech.buildwithpartha.lifeos.braindump.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.Set;
import java.util.UUID;
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
import tech.buildwithpartha.lifeos.braindump.application.BrainDumpService;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItem;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemQuery;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemQueryResult;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemStatus;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;

/** REST controller exposing Brain Dump Item endpoints (LOS-1204). */
@RestController
@RequestMapping("/brain-dump-items")
@SecurityRequirement(name = "sessionCookie")
public class BrainDumpController {

  private static final Set<String> ALLOWED_SORT_FIELDS =
      Set.of("content", "status", "createdAt", "updatedAt");

  private final BrainDumpService brainDumpService;

  public BrainDumpController(BrainDumpService brainDumpService) {
    this.brainDumpService = brainDumpService;
  }

  @Operation(
      summary = "Query brain dump items",
      description = "Search, filter, and paginate user brain dump items.")
  @ApiResponse(responseCode = "200", description = "Query results.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping
  public PageResponse<BrainDumpItemResponse> queryItems(
      @AuthenticationPrincipal UUID userId,
      @RequestParam(name = "q", required = false) String q,
      @RequestParam(name = "status", required = false) String status,
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

    BrainDumpItemStatus parsedStatus = null;
    if (status != null) {
      try {
        parsedStatus = BrainDumpItemStatus.valueOf(status.toUpperCase());
      } catch (IllegalArgumentException e) {
        throw new FieldValidationException(
            "Validation failed", List.of(new FieldProblem("status", "INVALID")));
      }
    }

    BrainDumpItemQuery query =
        new BrainDumpItemQuery(userId, q, parsedStatus, archived, page, size, sortBy, sortDirection);
    BrainDumpItemQueryResult result = brainDumpService.listItems(query);

    List<BrainDumpItemResponse> items =
        result.items().stream().map(BrainDumpItemResponse::fromDomain).toList();
    return PageResponse.of(items, page, size, result.totalItems());
  }

  @Operation(summary = "Capture item", description = "Captures a new Brain Dump item.")
  @ApiResponse(responseCode = "201", description = "Brain Dump item captured.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping
  public ResponseEntity<BrainDumpItemResponse> capture(
      @AuthenticationPrincipal UUID userId,
      @Valid @RequestBody CaptureBrainDumpRequest request) {
    BrainDumpItem created = brainDumpService.capture(userId, request.toCommand());
    BrainDumpItemResponse response = BrainDumpItemResponse.fromDomain(created);
    URI location = URI.create("/life-os/api/v1/brain-dump-items/" + created.id());
    return ResponseEntity.created(location).body(response);
  }

  @Operation(summary = "Get brain dump item", description = "Retrieves a Brain Dump item by ID.")
  @ApiResponse(responseCode = "200", description = "Brain Dump item details.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/{id}")
  public BrainDumpItemResponse getItem(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    BrainDumpItem item = brainDumpService.getItem(userId, id);
    return BrainDumpItemResponse.fromDomain(item);
  }

  @Operation(
      summary = "Update brain dump item content",
      description = "Updates the textual content of a Brain Dump item.")
  @ApiResponse(responseCode = "200", description = "Brain Dump item updated.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PutMapping("/{id}")
  public BrainDumpItemResponse updateContent(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody UpdateBrainDumpContentRequest request) {
    BrainDumpItem updated =
        brainDumpService.updateContent(userId, id, request.toCommand(), request.version());
    return BrainDumpItemResponse.fromDomain(updated);
  }

  @Operation(summary = "Defer item", description = "Marks a Brain Dump item as DEFERRED.")
  @ApiResponse(responseCode = "200", description = "Brain Dump item deferred.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/defer")
  public BrainDumpItemResponse defer(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody BrainDumpItemVersionRequest request) {
    BrainDumpItem deferred = brainDumpService.defer(userId, id, request.version());
    return BrainDumpItemResponse.fromDomain(deferred);
  }

  @Operation(summary = "Archive item", description = "Archives a Brain Dump item.")
  @ApiResponse(responseCode = "200", description = "Brain Dump item archived.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/archive")
  public BrainDumpItemResponse archive(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody BrainDumpItemVersionRequest request) {
    BrainDumpItem archived = brainDumpService.archive(userId, id, request.version());
    return BrainDumpItemResponse.fromDomain(archived);
  }

  @Operation(summary = "Restore item", description = "Restores an archived Brain Dump item.")
  @ApiResponse(responseCode = "200", description = "Brain Dump item restored.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/restore")
  public BrainDumpItemResponse restore(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody BrainDumpItemVersionRequest request) {
    BrainDumpItem restored = brainDumpService.restore(userId, id, request.version());
    return BrainDumpItemResponse.fromDomain(restored);
  }

  @Operation(summary = "Delete item", description = "Permanently deletes a Brain Dump item.")
  @ApiResponse(responseCode = "204", description = "Brain Dump item deleted.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    brainDumpService.delete(userId, id);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Convert to task",
      description =
          "Idempotently converts a Brain Dump item into a Task. "
              + "If already converted, returns the existing conversion details.")
  @ApiResponse(responseCode = "200", description = "Converted or already converted.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/convert/task")
  public BrainDumpItemResponse convertToTask(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody ConvertToTaskRequest request) {
    BrainDumpItem converted =
        brainDumpService.convertToTask(userId, id, request.toCommand(), request.version());
    return BrainDumpItemResponse.fromDomain(converted);
  }

  @Operation(
      summary = "Convert to note",
      description =
          "Idempotently converts a Brain Dump item into a Note. "
              + "If already converted, returns the existing conversion details.")
  @ApiResponse(responseCode = "200", description = "Converted or already converted.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/convert/note")
  public BrainDumpItemResponse convertToNote(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody ConvertToNoteRequest request) {
    BrainDumpItem converted =
        brainDumpService.convertToNote(userId, id, request.toCommand(), request.version());
    return BrainDumpItemResponse.fromDomain(converted);
  }

  @Operation(
      summary = "Convert to project",
      description =
          "Idempotently converts a Brain Dump item into a Project. "
              + "If already converted, returns the existing conversion details.")
  @ApiResponse(responseCode = "200", description = "Converted or already converted.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/convert/project")
  public BrainDumpItemResponse convertToProject(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody ConvertToProjectRequest request) {
    BrainDumpItem converted =
        brainDumpService.convertToProject(userId, id, request.toCommand(), request.version());
    return BrainDumpItemResponse.fromDomain(converted);
  }

  @Operation(
      summary = "Convert to goal",
      description =
          "Idempotently converts a Brain Dump item into a Goal. "
              + "If already converted, returns the existing conversion details.")
  @ApiResponse(responseCode = "200", description = "Converted or already converted.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/convert/goal")
  public BrainDumpItemResponse convertToGoal(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody ConvertToGoalRequest request) {
    BrainDumpItem converted =
        brainDumpService.convertToGoal(userId, id, request.toCommand(), request.version());
    return BrainDumpItemResponse.fromDomain(converted);
  }
}
