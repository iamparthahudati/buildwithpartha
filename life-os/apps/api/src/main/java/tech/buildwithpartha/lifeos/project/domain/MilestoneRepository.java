package tech.buildwithpartha.lifeos.project.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Port for loading, persisting, and deleting Milestones. */
public interface MilestoneRepository {

  Optional<Milestone> findById(UUID id);

  List<Milestone> findByProjectId(UUID projectId);

  Milestone save(Milestone milestone);

  void delete(Milestone milestone);
}
