package tech.buildwithpartha.lifeos.report.api;

import java.util.List;
import tech.buildwithpartha.lifeos.report.application.ReportTableData;

/** Tabular data breakdown included in reports (LOS-1109). */
public record ReportTable(
    String tableId,
    String title,
    String description,
    List<String> headers,
    List<List<Object>> rows,
    int totalRows) {

  public static ReportTable from(ReportTableData table) {
    return new ReportTable(
        table.tableId(),
        table.title(),
        table.description(),
        table.headers(),
        table.rows(),
        table.totalRows());
  }
}
