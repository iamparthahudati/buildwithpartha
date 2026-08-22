package tech.buildwithpartha.lifeos.project.application;

import java.time.LocalDate;
import tech.buildwithpartha.lifeos.project.domain.MilestoneStatus;

/** Command containing arguments to create a Milestone. */
public record CreateMilestoneCommand(
    String title, LocalDate date, MilestoneStatus status, int ordering) {}
