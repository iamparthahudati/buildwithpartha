package tech.buildwithpartha.lifeos.project.api;

import java.util.List;

/** Aggregate response DTO for project detail view (LOS-0715). */
public record ProjectDetailResponse(ProjectResponse project, List<MilestoneResponse> milestones) {}
