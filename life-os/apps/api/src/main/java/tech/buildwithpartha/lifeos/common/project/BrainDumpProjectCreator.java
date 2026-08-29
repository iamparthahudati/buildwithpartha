package tech.buildwithpartha.lifeos.common.project;

import java.util.UUID;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToProjectCommand;

public interface BrainDumpProjectCreator {
  UUID createProject(UUID userId, ConvertToProjectCommand command);
}
