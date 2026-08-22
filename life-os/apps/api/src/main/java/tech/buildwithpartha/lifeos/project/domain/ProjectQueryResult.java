package tech.buildwithpartha.lifeos.project.domain;

import java.util.List;
import java.util.Objects;

/** Wraps paginated list of projects and the total count. */
public record ProjectQueryResult(List<Project> projects, long totalItems) {
  public ProjectQueryResult {
    Objects.requireNonNull(projects, "projects list must not be null");
    projects = List.copyOf(projects);
  }
}
