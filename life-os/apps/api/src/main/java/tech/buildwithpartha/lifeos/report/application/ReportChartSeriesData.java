package tech.buildwithpartha.lifeos.report.application;

import java.util.List;
import tech.buildwithpartha.lifeos.report.domain.ReportChartType;

/** Application model for chart series data (LOS-1109). */
public record ReportChartSeriesData(
    String chartId,
    String title,
    ReportChartType chartType,
    String xAxisLabel,
    String yAxisLabel,
    List<ReportDataPointValue> dataPoints) {}
