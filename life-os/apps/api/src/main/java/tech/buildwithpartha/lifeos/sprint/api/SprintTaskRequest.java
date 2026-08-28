package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record SprintTaskRequest(@NotNull UUID taskId, @Min(0) int storyPoints, int position) {}
