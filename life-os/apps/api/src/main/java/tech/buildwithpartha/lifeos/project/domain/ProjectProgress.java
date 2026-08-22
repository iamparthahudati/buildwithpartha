package tech.buildwithpartha.lifeos.project.domain;

import java.util.Objects;

/** Value record representing the calculated progress percentage and health of a project. */
public record ProjectProgress(int percentage, ProjectHealth health) {

  public ProjectProgress {
    Objects.requireNonNull(health, "health must not be null");
    if (percentage < 0 || percentage > 100) {
      throw new IllegalArgumentException("percentage must be between 0 and 100");
    }
  }
}
