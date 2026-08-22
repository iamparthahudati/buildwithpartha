package tech.buildwithpartha.lifeos.project.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Port for loading, persisting, and deleting Projects. */
public interface ProjectRepository {

  Optional<Project> findById(UUID id);

  List<Project> findByUserId(UUID userId);

  Project save(Project project);

  void delete(Project project);

  ProjectQueryResult query(ProjectQuery query);

  ProjectSummaryCounts getSummaryCounts(UUID userId);
}
