package tech.buildwithpartha.lifeos.goal.api;

import tech.buildwithpartha.lifeos.common.pagination.PageResponse;

/** Response envelope for Goal query results, including paginated items and summary counts. */
public record GoalQueryResponse(
    PageResponse<GoalResponse> page, GoalSummaryCountsResponse summary) {}
