package tech.buildwithpartha.lifeos.task.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.project.MilestoneLookupPort;
import tech.buildwithpartha.lifeos.common.project.MilestoneReference;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskDomainFixture;
import tech.buildwithpartha.lifeos.task.domain.TaskMilestoneAssignment;
import tech.buildwithpartha.lifeos.task.domain.TaskMilestoneRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;

class TaskMilestoneServiceTests {

  private TaskRepository taskRepository;
  private TaskMilestoneRepository taskMilestoneRepository;
  private MilestoneLookupPort milestoneLookupPort;
  private TaskMilestoneService service;

  private UUID userId;
  private UUID projectId;

  @BeforeEach
  void setUp() {
    taskRepository = mock(TaskRepository.class);
    taskMilestoneRepository = mock(TaskMilestoneRepository.class);
    milestoneLookupPort = mock(MilestoneLookupPort.class);
    service =
        new TaskMilestoneService(taskRepository, taskMilestoneRepository, milestoneLookupPort);
    userId = UUID.randomUUID();
    projectId = UUID.randomUUID();
  }

  private MilestoneReference milestone(UUID milestoneId, UUID milestoneProjectId) {
    return new MilestoneReference(
        milestoneId, milestoneProjectId, "Beta launch", Optional.of(LocalDate.of(2026, 11, 30)));
  }

  @Test
  @DisplayName("assign persists the assignment when task and milestone share a project")
  void assignSuccess() {
    Task task = TaskDomainFixture.createSampleTask(userId, Optional.of(projectId));
    UUID milestoneId = UUID.randomUUID();
    when(taskRepository.findByIdAndUserId(task.id(), userId)).thenReturn(Optional.of(task));
    when(milestoneLookupPort.findOwnedMilestone(userId, milestoneId))
        .thenReturn(Optional.of(milestone(milestoneId, projectId)));
    when(taskMilestoneRepository.findByTaskId(task.id())).thenReturn(Optional.empty());

    MilestoneReference result = service.assign(userId, task.id(), milestoneId);

    assertThat(result.milestoneId()).isEqualTo(milestoneId);
    verify(taskMilestoneRepository).save(any(TaskMilestoneAssignment.class));
  }

  @Test
  @DisplayName("assign rejects a milestone the user does not own")
  void assignMilestoneNotFound() {
    Task task = TaskDomainFixture.createSampleTask(userId, Optional.of(projectId));
    UUID milestoneId = UUID.randomUUID();
    when(taskRepository.findByIdAndUserId(task.id(), userId)).thenReturn(Optional.of(task));
    when(milestoneLookupPort.findOwnedMilestone(userId, milestoneId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.assign(userId, task.id(), milestoneId))
        .isInstanceOf(FieldValidationException.class);
    verify(taskMilestoneRepository, never()).save(any());
  }

  @Test
  @DisplayName("assign rejects a milestone from a different project")
  void assignProjectMismatch() {
    Task task = TaskDomainFixture.createSampleTask(userId, Optional.of(projectId));
    UUID milestoneId = UUID.randomUUID();
    UUID otherProject = UUID.randomUUID();
    when(taskRepository.findByIdAndUserId(task.id(), userId)).thenReturn(Optional.of(task));
    when(milestoneLookupPort.findOwnedMilestone(userId, milestoneId))
        .thenReturn(Optional.of(milestone(milestoneId, otherProject)));

    assertThatThrownBy(() -> service.assign(userId, task.id(), milestoneId))
        .isInstanceOf(FieldValidationException.class);
    verify(taskMilestoneRepository, never()).save(any());
  }

  @Test
  @DisplayName("assign rejects a task with no project")
  void assignProjectlessTask() {
    Task task = TaskDomainFixture.createSampleTask(userId, Optional.empty());
    UUID milestoneId = UUID.randomUUID();
    when(taskRepository.findByIdAndUserId(task.id(), userId)).thenReturn(Optional.of(task));
    when(milestoneLookupPort.findOwnedMilestone(userId, milestoneId))
        .thenReturn(Optional.of(milestone(milestoneId, projectId)));

    assertThatThrownBy(() -> service.assign(userId, task.id(), milestoneId))
        .isInstanceOf(FieldValidationException.class);
  }

  @Test
  @DisplayName("assign rejects a task the user does not own")
  void assignTaskNotFound() {
    UUID taskId = UUID.randomUUID();
    when(taskRepository.findByIdAndUserId(taskId, userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.assign(userId, taskId, UUID.randomUUID()))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  @DisplayName("clear removes the assignment for an owned task")
  void clearSuccess() {
    Task task = TaskDomainFixture.createSampleTask(userId, Optional.of(projectId));
    when(taskRepository.findByIdAndUserId(task.id(), userId)).thenReturn(Optional.of(task));

    service.clear(userId, task.id());

    verify(taskMilestoneRepository).deleteByTaskId(task.id());
  }

  @Test
  @DisplayName("tasksForMilestone returns owned, non-deleted assigned tasks")
  void tasksForMilestoneReturnsTasks() {
    UUID milestoneId = UUID.randomUUID();
    Task task = TaskDomainFixture.createSampleTask(userId, Optional.of(projectId));
    when(milestoneLookupPort.findOwnedMilestone(userId, milestoneId))
        .thenReturn(Optional.of(milestone(milestoneId, projectId)));
    when(taskMilestoneRepository.findTaskIdsByMilestoneId(milestoneId))
        .thenReturn(List.of(task.id()));
    when(taskRepository.findByIdAndUserId(task.id(), userId)).thenReturn(Optional.of(task));

    List<MilestoneTaskView> views = service.tasksForMilestone(userId, milestoneId);

    assertThat(views).hasSize(1);
    assertThat(views.get(0).taskId()).isEqualTo(task.id());
  }

  @Test
  @DisplayName("tasksForMilestone rejects a milestone the user does not own")
  void tasksForMilestoneNotOwned() {
    UUID milestoneId = UUID.randomUUID();
    when(milestoneLookupPort.findOwnedMilestone(userId, milestoneId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.tasksForMilestone(userId, milestoneId))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  @DisplayName("getAssignedMilestone returns the milestone when assigned")
  void getAssignedMilestone() {
    UUID milestoneId = UUID.randomUUID();
    Task task = TaskDomainFixture.createSampleTask(userId, Optional.of(projectId));
    when(taskRepository.findByIdAndUserId(task.id(), userId)).thenReturn(Optional.of(task));
    when(taskMilestoneRepository.findByTaskId(task.id()))
        .thenReturn(
            Optional.of(
                new TaskMilestoneAssignment(
                    task.id(),
                    userId,
                    milestoneId,
                    java.time.Instant.now(),
                    java.time.Instant.now(),
                    0L)));
    when(milestoneLookupPort.findOwnedMilestone(userId, milestoneId))
        .thenReturn(Optional.of(milestone(milestoneId, projectId)));

    Optional<MilestoneReference> result = service.getAssignedMilestone(userId, task.id());

    assertThat(result).isPresent();
    assertThat(result.get().milestoneId()).isEqualTo(milestoneId);
  }
}
