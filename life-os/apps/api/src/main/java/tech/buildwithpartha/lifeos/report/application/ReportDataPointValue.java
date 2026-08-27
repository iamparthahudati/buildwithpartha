package tech.buildwithpartha.lifeos.report.application;

/** Application model for a chart data point value (LOS-1109). */
public record ReportDataPointValue(String label, Double value, String category, String date) {}
