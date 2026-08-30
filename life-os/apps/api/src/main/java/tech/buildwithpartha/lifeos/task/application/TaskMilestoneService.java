package tech.buildwithpartha.lifeos.task.application;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.project.MilestoneLookupPort;
import tech.buildwithpartha.lifeos.common.project.MilestoneReference;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskMilestoneAssignment;
import tech.buildwithpartha.lifeos.task.domain.TaskMilestoneRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;

/**
 * Assigns tasks to project milestones and reads assignments (LOS-0826). Enforces that a task and
 * its milestone belong to the same project and the same owning user.
 */
@Service
public class TaskMilestoneService {

  private final TaskRepository taskRepository;
  private final TaskMilestoneRepository taskMilestoneRepository;
  private final MilestoneLookupPort milestoneLookupPort;

  public TaskMilestoneService(
      TaskRepository taskRepository,
      TaskMilestoneRepository taskMilestoneRepository,
      MilestoneLookupPort milestoneLookupPort) {
    this.taskRepository = taskRepository;
    this.taskMilestoneRepository = taskMilestoneRepository;
    this.milestoneLookupPort = milestoneLookupPort;
  }

  /** Assigns the task to the milestone, replacing any existing assignment. */
  @Transactional
  public MilestoneReference assign(UUID userId, UUID taskId, UUID milestoneId) {
    Task task = ownedTask(userId, taskId);
    MilestoneReference milestone =
        milestoneLookupPort
            .findOwnedMilestone(userId, milestoneId)
            .orElseThrow(
                () ->
                    new FieldValidationException(
                        "Milestone not found",
                        List.of(new FieldProblem("milestoneId", "MILESTONE_NOT_FOUND"))));

    UUID taskProjectId = task.projectId().orElse(null);
    if (taskProjectId == null || !taskProjectId.equals(milestone.projectId())) {
      throw new FieldValidationException(
          "Milestone must belong to the same project as the task",
          List.of(new FieldProblem("milestoneId", "MILESTONE_PROJECT_MISMATCH")));
    }

    Instant now = Instant.now();
    TaskMilestoneAssignment assignment =
        taskMilestoneRepository
            .findByTaskId(taskId)
            .map(existing -> existing.withMilestone(milestoneId, now))
            .orElseGet(
                () -> new TaskMilestoneAssignment(taskId, userId, milestoneId, now, now, 0L));
    taskMilestoneRepository.save(assignment);
    return milestone;
  }

  /** Clears any milestone assignment for the task. No-op when none exists. */
  @Transactional
  public void clear(UUID userId, UUID taskId) {
    ownedTask(userId, taskId);
    taskMilestoneRepository.deleteByTaskId(taskId);
  }

  /** The milestone currently assigned to the task, if any. */
  @Transactional(readOnly = true)
  public Optional<MilestoneReference> getAssignedMilestone(UUID userId, UUID taskId) {
    ownedTask(userId, taskId);
    return taskMilestoneRepository
        .findByTaskId(taskId)
        .flatMap(a -> milestoneLookupPort.findOwnedMilestone(userId, a.milestoneId()));
  }

  /** Tasks assigned to the given owned milestone. */
  @Transactional(readOnly = true)
  public List<MilestoneTaskView> tasksForMilestone(UUID userId, UUID milestoneId) {
    milestoneLookupPort
        .findOwnedMilestone(userId, milestoneId)
        .orElseThrow(() -> new ResourceNotFoundException("Milestone not found"));
    return taskMilestoneRepository.findTaskIdsByMilestoneId(milestoneId).stream()
        .map(taskId -> taskRepository.findByIdAndUserId(taskId, userId))
        .flatMap(Optional::stream)
        .filter(task -> !task.isDeleted())
        .map(
            task ->
                new MilestoneTaskView(
                    task.id(),
                    task.title(),
                    task.status(),
                    task.priority(),
                    task.estimateMinutes()))
        .toList();
  }

  private Task ownedTask(UUID userId, UUID taskId) {
    return taskRepository
        .findByIdAndUserId(taskId, userId)
        .filter(task -> !task.isDeleted())
        .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
  }
}
