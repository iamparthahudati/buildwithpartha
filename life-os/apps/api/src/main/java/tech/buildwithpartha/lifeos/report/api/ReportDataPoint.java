package tech.buildwithpartha.lifeos.report.api;

import tech.buildwithpartha.lifeos.report.application.ReportDataPointValue;

/** Individual data point for chart visualizations in reports (LOS-1109). */
public record ReportDataPoint(String label, Double value, String category, String date) {

  public static ReportDataPoint from(ReportDataPointValue dp) {
    return new ReportDataPoint(dp.label(), dp.value(), dp.category(), dp.date());
  }
}
