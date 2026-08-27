package tech.buildwithpartha.lifeos.report.api;

import java.util.List;
import tech.buildwithpartha.lifeos.report.application.ReportChartSeriesData;
import tech.buildwithpartha.lifeos.report.domain.ReportChartType;

/** Chart series configuration and data points for visual reports (LOS-1109). */
public record ReportChartSeries(
    String chartId,
    String title,
    ReportChartType chartType,
    String xAxisLabel,
    String yAxisLabel,
    List<ReportDataPoint> dataPoints) {

  public static ReportChartSeries from(ReportChartSeriesData series) {
    List<ReportDataPoint> points = series.dataPoints().stream().map(ReportDataPoint::from).toList();
    return new ReportChartSeries(
        series.chartId(),
        series.title(),
        series.chartType(),
        series.xAxisLabel(),
        series.yAxisLabel(),
        points);
  }
}
