package tech.buildwithpartha.lifeos.task.api;

import java.util.List;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.application.MilestoneTaskView;

/** Tasks assigned to a milestone (LOS-0826). */
public record MilestoneTasksResponse(List<Item> tasks) {

  public record Item(
      UUID taskId, String title, String status, String priority, int estimateMinutes) {}

  public static MilestoneTasksResponse from(List<MilestoneTaskView> views) {
    return new MilestoneTasksResponse(
        views.stream()
            .map(
                v ->
                    new Item(
                        v.taskId(),
                        v.title(),
                        v.status().name(),
                        v.priority().name(),
                        v.estimateMinutes()))
            .toList());
  }
}
