package tech.buildwithpartha.lifeos.project.application;

import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.project.BrainDumpProjectCreator;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToProjectCommand;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;

@Service
public class BrainDumpProjectCreatorAdapter implements BrainDumpProjectCreator {

  private final ProjectService projectService;

  public BrainDumpProjectCreatorAdapter(ProjectService projectService) {
    this.projectService = projectService;
  }

  @Override
  public UUID createProject(UUID userId, ConvertToProjectCommand command) {
    CreateProjectCommand serviceCommand = new CreateProjectCommand(
        command.name(),
        command.description().orElse(null),
        ProjectStatus.PLANNED,
        ProjectPriority.valueOf(command.priority().toUpperCase()),
        ProjectHealth.NOT_SET,
        command.color().orElse(null),
        command.icon().orElse(null),
        command.startDate().orElse(null),
        command.deadlineDate().orElse(null),
        0, // estimateMinutes
        command.labelIds()
    );
    return projectService.createProject(userId, serviceCommand).id();
  }
}
