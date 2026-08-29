package tech.buildwithpartha.lifeos.project.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.comment.CommentParentAccess;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;

/** Project ownership/lifecycle adapter for the shared Comment domain. */
@Component
class ProjectCommentParentAccess implements CommentParentAccess {

  private final ProjectRepository projectRepository;

  ProjectCommentParentAccess(ProjectRepository projectRepository) {
    this.projectRepository = projectRepository;
  }

  @Override
  public CommentParentType parentType() {
    return CommentParentType.PROJECT;
  }

  @Override
  public void requireReadable(UUID userId, UUID parentId) {
    ownedProject(userId, parentId);
  }

  @Override
  public void requireWritable(UUID userId, UUID parentId) {
    Project project = ownedProject(userId, parentId);
    if (project.archivedAt().isPresent()) {
      throw new FieldValidationException(
          "Project is read-only", List.of(new FieldProblem("projectId", "READ_ONLY")));
    }
  }

  private Project ownedProject(UUID userId, UUID projectId) {
    return projectRepository
        .findById(projectId)
        .filter(project -> project.userId().equals(userId))
        .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
  }
}
