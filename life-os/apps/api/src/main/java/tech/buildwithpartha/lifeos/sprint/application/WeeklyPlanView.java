package tech.buildwithpartha.lifeos.sprint.application;

import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlan;
import tech.buildwithpartha.lifeos.sprint.domain.WeeklyPlanConflictSummary;

public record WeeklyPlanView(WeeklyPlan plan, WeeklyPlanConflictSummary conflictSummary) {}
