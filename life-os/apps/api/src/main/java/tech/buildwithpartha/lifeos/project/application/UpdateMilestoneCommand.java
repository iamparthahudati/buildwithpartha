package tech.buildwithpartha.lifeos.project.application;

import java.time.LocalDate;
import tech.buildwithpartha.lifeos.project.domain.MilestoneStatus;

/** Command containing arguments to update a Milestone. */
public record UpdateMilestoneCommand(
    String title, LocalDate date, MilestoneStatus status, int ordering, long version) {}
