package tech.buildwithpartha.lifeos.project.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
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
import tech.buildwithpartha.lifeos.project.application.CreateProjectCommand;
import tech.buildwithpartha.lifeos.project.application.ProjectService;
import tech.buildwithpartha.lifeos.project.application.UpdateProjectCommand;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectQuery;
import tech.buildwithpartha.lifeos.project.domain.ProjectQueryResult;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;
import tech.buildwithpartha.lifeos.project.domain.ProjectSummaryCounts;

/** Controller exposing REST endpoints for managing Projects (LOS-0702). */
@RestController
@RequestMapping("/projects")
@SecurityRequirement(name = "sessionCookie")
public class ProjectController {

  private final ProjectService projectService;

  public ProjectController(ProjectService projectService) {
    this.projectService = projectService;
  }

  private static final Set<String> ALLOWED_SORT_FIELDS =
      Set.of("name", "status", "priority", "health", "deadlineDate", "createdAt", "updatedAt");

  @Operation(
      summary = "Query projects",
      description = "Search, filter, paginate and retrieve summary counts for projects.")
  @ApiResponse(responseCode = "200", description = "Query results.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping
  public ProjectQueryResponse queryProjects(
      @AuthenticationPrincipal UUID userId,
      @RequestParam(name = "q", required = false) String q,
      @RequestParam(name = "status", required = false) Set<String> statusStrings,
      @RequestParam(name = "priority", required = false) Set<String> priorityStrings,
      @RequestParam(name = "health", required = false) Set<String> healthStrings,
      @RequestParam(name = "labelId", required = false) Set<UUID> labelIds,
      @RequestParam(name = "deadlineBefore", required = false) LocalDate deadlineBefore,
      @RequestParam(name = "deadlineAfter", required = false) LocalDate deadlineAfter,
      @RequestParam(name = "archived", required = false) Boolean archived,
      @RequestParam(name = "page", required = false, defaultValue = "0") int page,
      @RequestParam(name = "size", required = false, defaultValue = "20") int size,
      @RequestParam(name = "sortBy", required = false, defaultValue = "updatedAt") String sortBy,
      @RequestParam(name = "sortDirection", required = false, defaultValue = "DESC")
          String sortDirection) {

    // Validations
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

    Set<ProjectStatus> statuses = parseStatuses(statusStrings);
    Set<ProjectPriority> priorities = parsePriorities(priorityStrings);
    Set<ProjectHealth> healths = parseHealths(healthStrings);

    ProjectQuery query =
        new ProjectQuery(
            userId,
            q,
            statuses,
            priorities,
            healths,
            labelIds,
            deadlineBefore,
            deadlineAfter,
            archived,
            page,
            size,
            sortBy,
            sortDirection);

    ProjectQueryResult queryResult = projectService.queryProjects(query);
    ProjectSummaryCounts summary = projectService.getSummaryCounts(userId);

    List<ProjectResponse> items =
        queryResult.projects().stream().map(ProjectResponse::fromDomain).toList();

    PageResponse<ProjectResponse> pageResponse =
        PageResponse.of(items, page, size, queryResult.totalItems());

    return new ProjectQueryResponse(pageResponse, summary);
  }

  private Set<ProjectStatus> parseStatuses(Set<String> values) {
    if (values == null || values.isEmpty()) {
      return Set.of();
    }
    Set<ProjectStatus> result = new HashSet<>();
    for (String val : values) {
      try {
        result.add(ProjectStatus.valueOf(val.toUpperCase()));
      } catch (IllegalArgumentException e) {
        throw new FieldValidationException(
            "Validation failed", List.of(new FieldProblem("status", "INVALID")));
      }
    }
    return result;
  }

  private Set<ProjectPriority> parsePriorities(Set<String> values) {
    if (values == null || values.isEmpty()) {
      return Set.of();
    }
    Set<ProjectPriority> result = new HashSet<>();
    for (String val : values) {
      try {
        result.add(ProjectPriority.valueOf(val.toUpperCase()));
      } catch (IllegalArgumentException e) {
        throw new FieldValidationException(
            "Validation failed", List.of(new FieldProblem("priority", "INVALID")));
      }
    }
    return result;
  }

  private Set<ProjectHealth> parseHealths(Set<String> values) {
    if (values == null || values.isEmpty()) {
      return Set.of();
    }
    Set<ProjectHealth> result = new HashSet<>();
    for (String val : values) {
      try {
        result.add(ProjectHealth.valueOf(val.toUpperCase()));
      } catch (IllegalArgumentException e) {
        throw new FieldValidationException(
            "Validation failed", List.of(new FieldProblem("health", "INVALID")));
      }
    }
    return result;
  }

  @Operation(
      summary = "Create project",
      description = "Creates a new user-owned project with optional tags/labels.")
  @ApiResponse(responseCode = "200", description = "Project created successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping
  public ProjectResponse createProject(
      @AuthenticationPrincipal UUID userId, @Valid @RequestBody CreateProjectRequest request) {

    ProjectStatus status = parseStatus(request.status());
    ProjectPriority priority = parsePriority(request.priority());
    ProjectHealth health = parseHealth(request.health());

    Project created =
        projectService.createProject(
            userId,
            new CreateProjectCommand(
                request.name(),
                request.description(),
                status,
                priority,
                health,
                request.color(),
                request.icon(),
                request.startDate(),
                request.deadlineDate(),
                request.estimateMinutes(),
                request.labelIds()));

    return ProjectResponse.fromDomain(created);
  }

  @Operation(summary = "Get project", description = "Retrieves an existing project by ID.")
  @ApiResponse(responseCode = "200", description = "Project details.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/{id}")
  public ProjectResponse getProject(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    Project project = projectService.getProject(userId, id);
    return ProjectResponse.fromDomain(project);
  }

  @Operation(
      summary = "Update project",
      description = "Updates an existing project. Checks optimistic lock version.")
  @ApiResponse(responseCode = "200", description = "Project updated successfully.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PutMapping("/{id}")
  public ProjectResponse updateProject(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody UpdateProjectRequest request) {

    ProjectStatus status = parseStatus(request.status());
    ProjectPriority priority = parsePriority(request.priority());
    ProjectHealth health = parseHealth(request.health());

    Project updated =
        projectService.updateProject(
            userId,
            id,
            new UpdateProjectCommand(
                request.name(),
                request.description(),
                status,
                priority,
                health,
                request.color(),
                request.icon(),
                request.startDate(),
                request.deadlineDate(),
                request.estimateMinutes(),
                request.labelIds(),
                request.version()));

    return ProjectResponse.fromDomain(updated);
  }

  @Operation(
      summary = "Archive project",
      description = "Archives an active project. Idempotent action.")
  @ApiResponse(responseCode = "200", description = "Project archived successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/archive")
  public ProjectResponse archiveProject(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody ArchiveProjectRequest request) {
    Project archived = projectService.archiveProject(userId, id, request.version());
    return ProjectResponse.fromDomain(archived);
  }

  @Operation(
      summary = "Restore project",
      description = "Restores an archived project. Idempotent action.")
  @ApiResponse(responseCode = "200", description = "Project restored successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @PostMapping("/{id}/restore")
  public ProjectResponse restoreProject(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("id") UUID id,
      @Valid @RequestBody RestoreProjectRequest request) {
    Project restored = projectService.restoreProject(userId, id, request.version());
    return ProjectResponse.fromDomain(restored);
  }

  @Operation(summary = "Delete project", description = "Permanently deletes a project by ID.")
  @ApiResponse(responseCode = "204", description = "Project deleted successfully.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public ResponseEntity<Void> deleteProject(
      @AuthenticationPrincipal UUID userId, @PathVariable("id") UUID id) {
    projectService.deleteProject(userId, id);
    return ResponseEntity.noContent().build();
  }

  private ProjectStatus parseStatus(String value) {
    if (value == null) {
      return ProjectStatus.PLANNED;
    }
    try {
      return ProjectStatus.valueOf(value.toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("status", "INVALID")));
    }
  }

  private ProjectPriority parsePriority(String value) {
    if (value == null) {
      return ProjectPriority.P2;
    }
    try {
      return ProjectPriority.valueOf(value.toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("priority", "INVALID")));
    }
  }

  private ProjectHealth parseHealth(String value) {
    if (value == null) {
      return ProjectHealth.NOT_SET;
    }
    try {
      return ProjectHealth.valueOf(value.toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("health", "INVALID")));
    }
  }
}
