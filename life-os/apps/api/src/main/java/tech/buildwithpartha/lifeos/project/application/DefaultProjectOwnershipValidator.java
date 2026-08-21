package tech.buildwithpartha.lifeos.project.application;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.project.ProjectOwnershipValidator;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;

/** Project-owned implementation of the domain-neutral assignment validation contract. */
@Service
public class DefaultProjectOwnershipValidator implements ProjectOwnershipValidator {

  private final ProjectRepository projectRepository;

  public DefaultProjectOwnershipValidator(ProjectRepository projectRepository) {
    this.projectRepository = projectRepository;
  }

  @Override
  public void validateAssignment(UUID userId, UUID projectId) {
    Project project =
        projectRepository
            .findById(projectId)
            .filter(candidate -> candidate.userId().equals(userId))
            .orElseThrow(
                () ->
                    new FieldValidationException(
                        "Validation failed",
                        List.of(new FieldProblem("projectId", "INVALID_PROJECT"))));
    if (project.archivedAt().isPresent()) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("projectId", "ARCHIVED_PROJECT")));
    }
  }
}
