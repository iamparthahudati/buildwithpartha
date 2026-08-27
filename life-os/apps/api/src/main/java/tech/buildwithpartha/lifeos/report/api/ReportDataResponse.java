package tech.buildwithpartha.lifeos.report.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.NamedReportResult;
import tech.buildwithpartha.lifeos.report.domain.NamedReportType;

/** Complete response payload for named report data generation (LOS-1109). */
public record ReportDataResponse(
    NamedReportType reportType,
    String reportName,
    String description,
    String metricDictionaryVersion,
    Instant generatedAt,
    String timeZone,
    LocalDate startDate,
    LocalDate endDate,
    UUID projectId,
    UUID labelId,
    String category,
    boolean isAsynchronous,
    int asyncThresholdDays,
    String jobId,
    String status,
    String summaryText,
    List<ReportMetricItem> metrics,
    List<ReportTable> tables,
    List<ReportChartSeries> chartSeries) {

  public static ReportDataResponse from(NamedReportResult result) {
    List<ReportMetricItem> metrics = result.metrics().stream().map(ReportMetricItem::from).toList();
    List<ReportTable> tables = result.tables().stream().map(ReportTable::from).toList();
    List<ReportChartSeries> chartSeries =
        result.chartSeries().stream().map(ReportChartSeries::from).toList();

    return new ReportDataResponse(
        result.reportType(),
        result.reportName(),
        result.description(),
        result.metricDictionaryVersion(),
        result.generatedAt(),
        result.timeZone(),
        result.startDate(),
        result.endDate(),
        result.projectId(),
        result.labelId(),
        result.category(),
        result.isAsynchronous(),
        result.asyncThresholdDays(),
        result.jobId(),
        result.status(),
        result.summaryText(),
        metrics,
        tables,
        chartSeries);
  }
}
