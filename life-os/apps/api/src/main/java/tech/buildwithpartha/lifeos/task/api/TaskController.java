package tech.buildwithpartha.lifeos.task.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.time.Instant;
import java.time.LocalDate;
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
import org.springframework.web.bind.annotation.PatchMapping;
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
import tech.buildwithpartha.lifeos.task.application.CreateTaskCommand;
import tech.buildwithpartha.lifeos.task.application.TaskService;
import tech.buildwithpartha.lifeos.task.application.UpdateTaskCommand;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskQuery;
import tech.buildwithpartha.lifeos.task.domain.TaskQueryResult;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;
import tech.buildwithpartha.lifeos.task.domain.TaskSummaryCounts;

@RestController
@RequestMapping("/tasks")
@SecurityRequirement(name = "sessionCookie")
public class TaskController {

  private static final Set<String> ALLOWED_SORT_FIELDS =
      Set.of("title", "status", "priority", "dueAt", "createdAt", "updatedAt", "position");

  private final TaskService taskService;

  public TaskController(TaskService taskService) {
    this.taskService = taskService;
  }

  @Operation(
      summary = "Query tasks",
      description = "Search, filter, paginate and retrieve summary counts for tasks.")
  @ApiResponse(responseCode = "200", description = "Query results.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping
  public TaskQueryResponse queryTasks(
      @AuthenticationPrincipal UUID userId,
      @RequestParam(name = "q", required = false) String q,
      @RequestParam(name = "projectId", required = false) UUID projectId,
      @RequestParam(name = "status", required = false) Set<String> statusStrings,
      @RequestParam(name = "priority", required = false) Set<String> priorityStrings,
      @RequestParam(name = "mitDate", required = false) LocalDate mitDate,
      @RequestParam(name = "isMit", required = false) Boolean isMit,
      @RequestParam(name = "overdue", required = false) Boolean overdue,
      @RequestParam(name = "archived", required = false) Boolean archived,
      @RequestParam(name = "dueBefore", required = false) Instant dueBefore,
      @RequestParam(name = "dueAfter", required = false) Instant dueAfter,
      @RequestParam(name = "page", required = false, defaultValue = "0") int page,
      @RequestParam(name = "size", required = false, defaultValue = "20") int size,
      @RequestParam(name = "sortBy", required = false, defaultValue = "createdAt") String sortBy,
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

    Set<TaskStatus> statuses = parseStatuses(statusStrings);
    Set<TaskPriority> priorities = parsePriorities(priorityStrings);

    TaskQuery query =
        new TaskQuery(
            userId,
            q,
            projectId,
            statuses,
            priorities,
            mitDate,
            isMit,
            overdue,
            archived,
            dueBefore,
            dueAfter,
            page,
            size,
            sortBy,
            sortDirection);

    TaskQueryResult queryResult = taskService.queryTasks(query);
    TaskSummaryCounts summary = taskService.getSummaryCounts(userId);

    List<TaskResponse> items = queryResult.tasks().stream().map(TaskResponse::fromDomain).toList();

    PageResponse<TaskResponse> pageResponse =
        PageResponse.of(items, page, size, queryResult.totalItems());

    return new TaskQueryResponse(pageResponse, summary);
  }

  @Operation(summary = "Get task summary counts", description = "Retrieves user's task counts.")
  @ApiResponse(responseCode = "200", description = "Summary counts.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/summary-counts")
  public TaskSummaryCounts getSummaryCounts(@AuthenticationPrincipal UUID userId) {
    return taskService.getSummaryCounts(userId);
  }

  @Operation(summary = "Create task", description = "Creates a new user-owned task.")
  @ApiResponse(responseCode = "201", description = "Task created successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public TaskResponse createTask(
      @AuthenticationPrincipal UUID userId, @Valid @RequestBody CreateTaskRequest request) {

    TaskStatus status = parseStatus(request.status(), TaskStatus.TO_DO);
    TaskPriority priority = parsePriority(request.priority(), TaskPriority.P3);

    Task created =
        taskService.createTask(
            userId,
            new CreateTaskCommand(
                Optional.ofNullable(request.projectId()),
                request.title(),
                Optional.ofNullable(request.description()),
                status,
                priority,
                Optional.ofNullable(request.dueAt()),
                request.estimateMinutes() != null ? request.estimateMinutes() : 0,
                request.spentMinutes() != null ? request.spentMinutes() : 0,
                request.progress() != null ? request.progress() : 0,
                Optional.ofNullable(request.mitDate()),
                request.position() != null ? request.position() : 0));

    return TaskResponse.fromDomain(created);
  }

  @Operation(summary = "Get task", description = "Retrieves an existing task by ID.")
  @ApiResponse(responseCode = "200", description = "Task details.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/{id}")
  public TaskResponse getTask(@AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    Task task = taskService.getTask(userId, id);
    return TaskResponse.fromDomain(task);
  }

  @Operation(
      summary = "Update task",
      description = "Updates an existing task with optimistic lock check.")
  @ApiResponse(responseCode = "200", description = "Task updated successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PutMapping("/{id}")
  public TaskResponse updateTask(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody UpdateTaskRequest request) {

    TaskStatus status = parseStatus(request.status(), TaskStatus.TO_DO);
    TaskPriority priority = parsePriority(request.priority(), TaskPriority.P3);

    Task updated =
        taskService.updateTask(
            userId,
            id,
            new UpdateTaskCommand(
                Optional.ofNullable(request.projectId()),
                request.title(),
                Optional.ofNullable(request.description()),
                status,
                priority,
                Optional.ofNullable(request.dueAt()),
                request.estimateMinutes() != null ? request.estimateMinutes() : 0,
                request.spentMinutes() != null ? request.spentMinutes() : 0,
                request.progress() != null ? request.progress() : 0,
                Optional.ofNullable(request.mitDate()),
                request.position() != null ? request.position() : 0,
                request.version()));

    return TaskResponse.fromDomain(updated);
  }

  @Operation(summary = "Change task status", description = "Updates task status.")
  @ApiResponse(responseCode = "200", description = "Task status updated.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PatchMapping("/{id}/status")
  public TaskResponse changeStatus(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody ChangeTaskStatusRequest request) {

    TaskStatus status = parseStatus(request.status(), null);
    Task updated = taskService.changeStatus(userId, id, status, request.version());
    return TaskResponse.fromDomain(updated);
  }

  @Operation(summary = "Complete task", description = "Marks task status as DONE.")
  @ApiResponse(responseCode = "200", description = "Task completed.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/complete")
  public TaskResponse completeTask(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody ArchiveTaskRequest request) {

    Task completed = taskService.completeTask(userId, id, request.version());
    return TaskResponse.fromDomain(completed);
  }

  @Operation(summary = "Cancel task", description = "Marks task status as CANCELLED.")
  @ApiResponse(responseCode = "200", description = "Task cancelled.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/cancel")
  public TaskResponse cancelTask(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody ArchiveTaskRequest request) {

    Task cancelled = taskService.cancelTask(userId, id, request.version());
    return TaskResponse.fromDomain(cancelled);
  }

  @Operation(summary = "Archive task", description = "Archives an active task.")
  @ApiResponse(responseCode = "200", description = "Task archived.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/archive")
  public TaskResponse archiveTask(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody ArchiveTaskRequest request) {

    Task archived = taskService.archiveTask(userId, id, request.version());
    return TaskResponse.fromDomain(archived);
  }

  @Operation(summary = "Restore task", description = "Restores an archived task.")
  @ApiResponse(responseCode = "200", description = "Task restored.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/restore")
  public TaskResponse restoreTask(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody RestoreTaskRequest request) {

    Task restored = taskService.restoreTask(userId, id, request.version());
    return TaskResponse.fromDomain(restored);
  }

  @Operation(summary = "Delete task", description = "Soft-deletes a task.")
  @ApiResponse(responseCode = "204", description = "Task deleted.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public ResponseEntity<Void> deleteTask(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    taskService.deleteTask(userId, id);
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "Duplicate task", description = "Duplicates a task and its subtasks.")
  @ApiResponse(responseCode = "201", description = "Task duplicated.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/duplicate")
  @ResponseStatus(HttpStatus.CREATED)
  public TaskResponse duplicateTask(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @RequestBody(required = false) DuplicateTaskRequest request) {

    String newTitle = request != null ? request.newTitle() : null;
    Task duplicated = taskService.duplicateTask(userId, id, newTitle);
    return TaskResponse.fromDomain(duplicated);
  }

  private Set<TaskStatus> parseStatuses(Set<String> values) {
    if (values == null || values.isEmpty()) {
      return Set.of();
    }
    Set<TaskStatus> result = new HashSet<>();
    for (String val : values) {
      try {
        result.add(TaskStatus.valueOf(val.toUpperCase()));
      } catch (IllegalArgumentException e) {
        throw new FieldValidationException(
            "Validation failed", List.of(new FieldProblem("status", "INVALID")));
      }
    }
    return result;
  }

  private Set<TaskPriority> parsePriorities(Set<String> values) {
    if (values == null || values.isEmpty()) {
      return Set.of();
    }
    Set<TaskPriority> result = new HashSet<>();
    for (String val : values) {
      try {
        result.add(TaskPriority.valueOf(val.toUpperCase()));
      } catch (IllegalArgumentException e) {
        throw new FieldValidationException(
            "Validation failed", List.of(new FieldProblem("priority", "INVALID")));
      }
    }
    return result;
  }

  private TaskStatus parseStatus(String value, TaskStatus defaultValue) {
    if (value == null || value.isBlank()) {
      return defaultValue;
    }
    try {
      return TaskStatus.valueOf(value.toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("status", "INVALID")));
    }
  }

  private TaskPriority parsePriority(String value, TaskPriority defaultValue) {
    if (value == null || value.isBlank()) {
      return defaultValue;
    }
    try {
      return TaskPriority.valueOf(value.toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("priority", "INVALID")));
    }
  }
}
