package tech.buildwithpartha.lifeos.project.api;

import tech.buildwithpartha.lifeos.common.pagination.PageResponse;
import tech.buildwithpartha.lifeos.project.domain.ProjectSummaryCounts;

/** API response representing a page of projects and dashboard summary metrics. */
public record ProjectQueryResponse(
    PageResponse<ProjectResponse> page, ProjectSummaryCounts summary) {}
