package tech.buildwithpartha.lifeos.audit.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.audit.application.ActivityReadItem;
import tech.buildwithpartha.lifeos.audit.application.ActivityReadService;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;

/** Authenticated, owner-scoped Task and Project Activity reads. */
@RestController
@SecurityRequirement(name = "sessionCookie")
public class ActivityController {

  private final ActivityReadService service;

  public ActivityController(ActivityReadService service) {
    this.service = service;
  }

  @Operation(
      operationId = "listTaskActivity",
      summary = "List Task activity",
      description =
          "Returns a bounded newest-first page of structured, content-minimized Task Activity. "
              + "The object is null when its current owner-scoped link is unavailable.")
  @ApiResponse(responseCode = "200", description = "Task Activity page.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/tasks/{taskId}/activity")
  public PageResponse<ActivityEventResponse> listTaskActivity(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("taskId") UUID taskId,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "size", defaultValue = "20") int size) {
    return response(service.read(userId, ActivitySubjectType.TASK, taskId, page, size));
  }

  @Operation(
      operationId = "listProjectActivity",
      summary = "List Project activity",
      description =
          "Returns a bounded newest-first page of structured, content-minimized Project Activity. "
              + "Task objects are resolved from current owner-scoped state and become null after "
              + "deletion.")
  @ApiResponse(responseCode = "200", description = "Project Activity page.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
  @GetMapping("/projects/{projectId}/activity")
  public PageResponse<ActivityEventResponse> listProjectActivity(
      @AuthenticationPrincipal UUID userId,
      @PathVariable("projectId") UUID projectId,
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "size", defaultValue = "20") int size) {
    return response(service.read(userId, ActivitySubjectType.PROJECT, projectId, page, size));
  }

  private static PageResponse<ActivityEventResponse> response(PageResponse<ActivityReadItem> page) {
    List<ActivityEventResponse> items =
        page.items().stream().map(ActivityEventResponse::fromApplication).toList();
    return PageResponse.of(items, page.page(), page.size(), page.totalItems());
  }
}
