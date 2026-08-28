package tech.buildwithpartha.lifeos.report.application;

import java.util.List;
import tech.buildwithpartha.lifeos.report.domain.NamedReportType;
import tech.buildwithpartha.lifeos.report.domain.ReportCategory;

/** Application model for a named report definition (LOS-1109). */
public record ReportDefinition(
    NamedReportType reportType,
    String name,
    String description,
    ReportCategory category,
    List<String> supportedFilters,
    int defaultTimeframeDays,
    int asyncThresholdDays) {}
