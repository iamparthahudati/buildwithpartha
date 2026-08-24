package tech.buildwithpartha.lifeos.common.task;

import java.util.UUID;

/** Safe current Task projection used by Sprint planning without coupling domain modules. */
public record SprintTaskSummary(UUID id, String title, String status, boolean terminal) {}
