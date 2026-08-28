package tech.buildwithpartha.lifeos.report.api;

import tech.buildwithpartha.lifeos.report.application.ReportMetric;

/** Key metric item included in report summaries (LOS-1109). */
public record ReportMetricItem(
    String key,
    String name,
    String value,
    Double numericValue,
    String unit,
    String comparisonValue,
    String status) {

  public static ReportMetricItem from(ReportMetric metric) {
    return new ReportMetricItem(
        metric.key(),
        metric.name(),
        metric.value(),
        metric.numericValue(),
        metric.unit(),
        metric.comparisonValue(),
        metric.status());
  }
}
