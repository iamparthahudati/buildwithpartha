package tech.buildwithpartha.lifeos.comment.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.comment.application.CommentService;
import tech.buildwithpartha.lifeos.comment.domain.Comment;
import tech.buildwithpartha.lifeos.comment.domain.CommentFormat;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;

/** Authenticated nested Task Comment CRUD API. */
@RestController
@RequestMapping("/tasks/{taskId}/comments")
@SecurityRequirement(name = "sessionCookie")
public class TaskCommentController {

  private final CommentService service;

  public TaskCommentController(CommentService service) {
    this.service = service;
  }

  @Operation(operationId = "listTaskComments", summary = "List Task comments")
  @ApiResponse(responseCode = "200", description = "Newest-first user-scoped Comment page.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @GetMapping
  public PageResponse<CommentResponse> list(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID taskId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    PageResponse<Comment> result = service.list(userId, CommentParentType.TASK, taskId, page, size);
    return PageResponse.of(
        result.items().stream().map(CommentResponse::fromDomain).toList(),
        result.page(),
        result.size(),
        result.totalItems());
  }

  @Operation(operationId = "createTaskComment", summary = "Add a Task comment")
  @SecurityRequirement(name = "csrfToken")
  @ApiResponse(responseCode = "201", description = "Comment created.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @PostMapping
  public ResponseEntity<CommentResponse> create(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID taskId,
      @Valid @RequestBody CreateCommentRequest request) {
    Comment created =
        service.create(
            userId,
            CommentParentType.TASK,
            taskId,
            request.body(),
            request.format() == null ? CommentFormat.PLAIN_TEXT : request.format());
    URI location = URI.create("/life-os/api/v1/tasks/" + taskId + "/comments/" + created.id());
    return ResponseEntity.created(location).body(CommentResponse.fromDomain(created));
  }

  @Operation(operationId = "getTaskComment", summary = "Get a Task comment")
  @ApiResponse(responseCode = "200", description = "Comment found.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @GetMapping("/{commentId}")
  public CommentResponse get(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID taskId,
      @PathVariable UUID commentId) {
    return CommentResponse.fromDomain(
        service.get(userId, CommentParentType.TASK, taskId, commentId));
  }

  @Operation(operationId = "updateTaskComment", summary = "Edit a Task comment")
  @SecurityRequirement(name = "csrfToken")
  @ApiResponse(responseCode = "200", description = "Comment updated.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @PutMapping("/{commentId}")
  public CommentResponse update(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID taskId,
      @PathVariable UUID commentId,
      @Valid @RequestBody UpdateCommentRequest request) {
    return CommentResponse.fromDomain(
        service.update(
            userId,
            CommentParentType.TASK,
            taskId,
            commentId,
            request.body(),
            request.format(),
            request.version()));
  }

  @Operation(operationId = "deleteTaskComment", summary = "Delete a Task comment")
  @SecurityRequirement(name = "csrfToken")
  @ApiResponse(responseCode = "204", description = "Comment body permanently deleted.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @DeleteMapping("/{commentId}")
  public ResponseEntity<Void> delete(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID taskId,
      @PathVariable UUID commentId,
      @Parameter(description = "Current non-negative Comment version", required = true)
          @RequestHeader(name = "If-Match", required = false)
          String version) {
    service.delete(
        userId, CommentParentType.TASK, taskId, commentId, CommentVersionHeaders.parse(version));
    return ResponseEntity.noContent().build();
  }
}
