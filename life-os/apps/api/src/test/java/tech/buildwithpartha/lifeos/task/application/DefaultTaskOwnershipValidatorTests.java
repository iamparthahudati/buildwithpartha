package tech.buildwithpartha.lifeos.task.application;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskDomainFixture;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;

class DefaultTaskOwnershipValidatorTests {

  private TaskRepository taskRepository;
  private DefaultTaskOwnershipValidator validator;

  private UUID userId;

  @BeforeEach
  void setUp() {
    taskRepository = mock(TaskRepository.class);
    validator = new DefaultTaskOwnershipValidator(taskRepository);
    userId = UUID.randomUUID();
  }

  @Test
  @DisplayName("validateAssignment succeeds for active task owned by user")
  void validateAssignmentSuccess() {
    Task task = TaskDomainFixture.createSampleTask(userId, Optional.empty());
    when(taskRepository.findByIdAndUserId(task.id(), userId)).thenReturn(Optional.of(task));

    assertThatCode(() -> validator.validateAssignment(userId, task.id()))
        .doesNotThrowAnyException();
  }

  @Test
  @DisplayName("validateAssignment throws FieldValidationException when task is not found")
  void validateAssignmentNotFound() {
    UUID taskId = UUID.randomUUID();
    when(taskRepository.findByIdAndUserId(taskId, userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> validator.validateAssignment(userId, taskId))
        .isInstanceOf(FieldValidationException.class);
  }

  @Test
  @DisplayName("validateAssignment throws FieldValidationException when task is archived")
  void validateAssignmentArchived() {
    Task activeTask = TaskDomainFixture.createSampleTask(userId, Optional.empty());
    Task archivedTask = activeTask.archive(Instant.now(), Instant.now());
    when(taskRepository.findByIdAndUserId(archivedTask.id(), userId))
        .thenReturn(Optional.of(archivedTask));

    assertThatThrownBy(() -> validator.validateAssignment(userId, archivedTask.id()))
        .isInstanceOf(FieldValidationException.class);
  }
}
