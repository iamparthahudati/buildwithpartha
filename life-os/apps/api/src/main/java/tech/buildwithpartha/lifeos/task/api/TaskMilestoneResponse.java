package tech.buildwithpartha.lifeos.task.api;

import java.time.LocalDate;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.project.MilestoneReference;

/** The milestone a task is assigned to (LOS-0826). */
public record TaskMilestoneResponse(
    UUID milestoneId, UUID projectId, String title, LocalDate date) {

  public static TaskMilestoneResponse from(MilestoneReference milestone) {
    return new TaskMilestoneResponse(
        milestone.milestoneId(),
        milestone.projectId(),
        milestone.title(),
        milestone.date().orElse(null));
  }
}
