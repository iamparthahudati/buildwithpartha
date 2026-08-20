package tech.buildwithpartha.lifeos.project.domain;

/** Holds dashboard summary metrics for projects. */
public record ProjectSummaryCounts(
    long total, long active, long completed, long onHold, long atRisk) {}
