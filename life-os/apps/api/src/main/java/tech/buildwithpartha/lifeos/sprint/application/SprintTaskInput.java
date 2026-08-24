package tech.buildwithpartha.lifeos.sprint.application;

import java.util.UUID;

public record SprintTaskInput(UUID taskId, int storyPoints, int position) {}
