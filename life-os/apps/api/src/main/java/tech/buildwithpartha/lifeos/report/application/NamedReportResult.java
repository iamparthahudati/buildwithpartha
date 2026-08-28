package tech.buildwithpartha.lifeos.report.application;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.domain.NamedReportType;

/** Application model for a complete generated report result (LOS-1109). */
public record NamedReportResult(
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
    List<ReportMetric> metrics,
    List<ReportTableData> tables,
    List<ReportChartSeriesData> chartSeries) {}
