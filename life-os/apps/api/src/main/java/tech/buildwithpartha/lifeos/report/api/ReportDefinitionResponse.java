package tech.buildwithpartha.lifeos.report.api;

import java.util.List;
import tech.buildwithpartha.lifeos.report.application.ReportDefinition;
import tech.buildwithpartha.lifeos.report.domain.NamedReportType;
import tech.buildwithpartha.lifeos.report.domain.ReportCategory;

/** Metadata record for a named report definition catalog entry (LOS-1109). */
public record ReportDefinitionResponse(
    NamedReportType reportType,
    String name,
    String description,
    ReportCategory category,
    List<String> supportedFilters,
    int defaultTimeframeDays,
    int asyncThresholdDays) {

  public static ReportDefinitionResponse from(ReportDefinition def) {
    return new ReportDefinitionResponse(
        def.reportType(),
        def.name(),
        def.description(),
        def.category(),
        def.supportedFilters(),
        def.defaultTimeframeDays(),
        def.asyncThresholdDays());
  }
}
