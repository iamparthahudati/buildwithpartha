package tech.buildwithpartha.lifeos.project.application;

import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.project.MilestoneLookupPort;
import tech.buildwithpartha.lifeos.common.project.MilestoneReference;
import tech.buildwithpartha.lifeos.project.domain.Milestone;
import tech.buildwithpartha.lifeos.project.domain.MilestoneRepository;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;

/** Project-owned adapter exposing milestone lookups scoped to the owning user. */
@Service
public class DefaultMilestoneLookupPort implements MilestoneLookupPort {

  private final MilestoneRepository milestoneRepository;
  private final ProjectRepository projectRepository;

  public DefaultMilestoneLookupPort(
      MilestoneRepository milestoneRepository, ProjectRepository projectRepository) {
    this.milestoneRepository = milestoneRepository;
    this.projectRepository = projectRepository;
  }

  @Override
  public Optional<MilestoneReference> findOwnedMilestone(UUID userId, UUID milestoneId) {
    if (userId == null || milestoneId == null) {
      return Optional.empty();
    }
    Optional<Milestone> milestone = milestoneRepository.findById(milestoneId);
    if (milestone.isEmpty()) {
      return Optional.empty();
    }
    Milestone found = milestone.get();
    Optional<Project> project = projectRepository.findById(found.projectId());
    if (project.isEmpty() || !project.get().userId().equals(userId)) {
      return Optional.empty();
    }
    return Optional.of(
        new MilestoneReference(found.id(), found.projectId(), found.title(), found.date()));
  }
}
