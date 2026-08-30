package tech.buildwithpartha.lifeos.common.project;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Minimal, cross-module view of a milestone the task module needs to validate and display a
 * task-to-milestone assignment without depending on the project domain aggregate.
 */
public record MilestoneReference(
    UUID milestoneId, UUID projectId, String title, Optional<LocalDate> date) {

  public MilestoneReference {
    if (milestoneId == null) {
      throw new IllegalArgumentException("milestoneId must not be null");
    }
    if (projectId == null) {
      throw new IllegalArgumentException("projectId must not be null");
    }
    if (title == null) {
      throw new IllegalArgumentException("title must not be null");
    }
    if (date == null) {
      throw new IllegalArgumentException("date must not be null");
    }
  }
}
