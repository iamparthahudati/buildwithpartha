package tech.buildwithpartha.lifeos.report.application;

import java.util.List;

/** Application model for a report tabular breakdown (LOS-1109). */
public record ReportTableData(
    String tableId,
    String title,
    String description,
    List<String> headers,
    List<List<Object>> rows,
    int totalRows) {}
