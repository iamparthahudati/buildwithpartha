package tech.buildwithpartha.lifeos.task.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tech.buildwithpartha.lifeos.task.application.TaskMilestoneService;

/** Endpoints for assigning tasks to project milestones (LOS-0826). */
@RestController
@SecurityRequirement(name = "sessionCookie")
public class TaskMilestoneController {

  private final TaskMilestoneService taskMilestoneService;

  public TaskMilestoneController(TaskMilestoneService taskMilestoneService) {
    this.taskMilestoneService = taskMilestoneService;
  }

  @Operation(
      summary = "Assign a task to a milestone",
      description = "Assigns the task to a milestone in the same project, replacing any existing.")
  @ApiResponse(responseCode = "200", description = "Assigned milestone.")
  @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @PutMapping("/tasks/{taskId}/milestone")
  public TaskMilestoneAssignmentResponse assign(
      @AuthenticationPrincipal UUID userId,
      @PathVariable UUID taskId,
      @Valid @RequestBody SetTaskMilestoneRequest request) {
    return new TaskMilestoneAssignmentResponse(
        TaskMilestoneResponse.from(
            taskMilestoneService.assign(userId, taskId, request.milestoneId())));
  }

  @Operation(
      summary = "Get a task's milestone",
      description = "Returns the milestone the task is assigned to, or null when unassigned.")
  @ApiResponse(responseCode = "200", description = "Current assignment.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @GetMapping("/tasks/{taskId}/milestone")
  public TaskMilestoneAssignmentResponse get(
      @AuthenticationPrincipal UUID userId, @PathVariable UUID taskId) {
    return new TaskMilestoneAssignmentResponse(
        taskMilestoneService
            .getAssignedMilestone(userId, taskId)
            .map(TaskMilestoneResponse::from)
            .orElse(null));
  }

  @Operation(
      summary = "Clear a task's milestone",
      description = "Removes any milestone assignment for the task.")
  @ApiResponse(responseCode = "204", description = "Cleared.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @DeleteMapping("/tasks/{taskId}/milestone")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void clear(@AuthenticationPrincipal UUID userId, @PathVariable UUID taskId) {
    taskMilestoneService.clear(userId, taskId);
  }

  @Operation(
      summary = "List tasks in a milestone",
      description = "Returns tasks currently assigned to the milestone.")
  @ApiResponse(responseCode = "200", description = "Assigned tasks.")
  @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized")
  @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound")
  @GetMapping("/milestones/{milestoneId}/tasks")
  public MilestoneTasksResponse tasksForMilestone(
      @AuthenticationPrincipal UUID userId, @PathVariable UUID milestoneId) {
    return MilestoneTasksResponse.from(taskMilestoneService.tasksForMilestone(userId, milestoneId));
  }
}
