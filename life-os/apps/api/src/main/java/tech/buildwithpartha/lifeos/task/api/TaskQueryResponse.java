package tech.buildwithpartha.lifeos.task.api;

import tech.buildwithpartha.lifeos.common.pagination.PageResponse;
import tech.buildwithpartha.lifeos.task.domain.TaskSummaryCounts;

public record TaskQueryResponse(PageResponse<TaskResponse> page, TaskSummaryCounts summary) {}
