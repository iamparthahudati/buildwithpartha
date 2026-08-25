package tech.buildwithpartha.lifeos.sprint.application;

import java.util.Optional;
import java.util.UUID;

public record WeeklyPlanOutcomeInput(Optional<UUID> id, String title, int position) {}
