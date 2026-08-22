package tech.buildwithpartha.lifeos.task.domain;

import java.util.List;

public record TaskQueryResult(List<Task> tasks, long totalItems) {}
