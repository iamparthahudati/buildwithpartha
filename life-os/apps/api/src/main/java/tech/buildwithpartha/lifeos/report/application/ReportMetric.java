package tech.buildwithpartha.lifeos.report.application;

/** Application model for a report metric item (LOS-1109). */
public record ReportMetric(
    String key,
    String name,
    String value,
    Double numericValue,
    String unit,
    String comparisonValue,
    String status) {}
