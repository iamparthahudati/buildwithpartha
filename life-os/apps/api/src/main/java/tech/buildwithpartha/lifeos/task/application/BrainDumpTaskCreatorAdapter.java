package tech.buildwithpartha.lifeos.task.application;

import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.task.BrainDumpTaskCreator;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToTaskCommand;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

@Service
public class BrainDumpTaskCreatorAdapter implements BrainDumpTaskCreator {

  private final TaskService taskService;

  public BrainDumpTaskCreatorAdapter(TaskService taskService) {
    this.taskService = taskService;
  }

  @Override
  public UUID createTask(UUID userId, ConvertToTaskCommand command) {
    CreateTaskCommand serviceCommand = new CreateTaskCommand(
        command.projectId(),
        command.title(),
        command.description(),
        TaskStatus.TO_DO,
        TaskPriority.valueOf(command.priority().toUpperCase()),
        command.dueAt(),
        0, // estimate
        0, // spent
        0, // progress
        Optional.empty(), // mitDate
        0, // position
        command.labelIds()
    );
    return taskService.createTask(userId, serviceCommand).id();
  }
}
