package tech.buildwithpartha.lifeos.report.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.report.domain.NamedReportType;
import tech.buildwithpartha.lifeos.report.domain.ReportChartType;

/**
 * Unit tests for CsvExportService RFC 4180 encoding and formula-injection protection (LOS-1111).
 */
class CsvExportServiceTests {

  private CsvExportService service;

  @BeforeEach
  void setUp() {
    service = new CsvExportService();
  }

  // ---------------------------------------------------------------------------
  // escapeCsvValue — formula-injection protection
  // ---------------------------------------------------------------------------

  @Test
  void doesNotModifyNormalValues() {
    assertThat(service.escapeCsvValue("Hello")).isEqualTo("Hello");
    assertThat(service.escapeCsvValue("100")).isEqualTo("100");
    assertThat(service.escapeCsvValue("2026-08-27")).isEqualTo("2026-08-27");
  }

  @Test
  void prefixesFormulaStartingWithEqualsSign() {
    assertThat(service.escapeCsvValue("=SUM(A1)")).isEqualTo("'=SUM(A1)");
  }

  @Test
  void prefixesFormulaStartingWithPlus() {
    assertThat(service.escapeCsvValue("+1")).isEqualTo("'+1");
  }

  @Test
  void prefixesFormulaStartingWithMinus() {
    assertThat(service.escapeCsvValue("-1")).isEqualTo("'-1");
  }

  @Test
  void prefixesFormulaStartingWithAt() {
    assertThat(service.escapeCsvValue("@SUM")).isEqualTo("'@SUM");
  }

  @Test
  void quotesValueContainingComma() {
    assertThat(service.escapeCsvValue("hello, world")).isEqualTo("\"hello, world\"");
  }

  @Test
  void quotesValueContainingDoubleQuote() {
    assertThat(service.escapeCsvValue("say \"hi\"")).isEqualTo("\"say \"\"hi\"\"\"");
  }

  @Test
  void quotesValueContainingNewline() {
    assertThat(service.escapeCsvValue("line1\nline2")).isEqualTo("\"line1\nline2\"");
  }

  @Test
  void handlesEmptyString() {
    assertThat(service.escapeCsvValue("")).isEqualTo("");
  }

  @Test
  void handlesNull() {
    assertThat(service.escapeCsvValue(null)).isEqualTo("");
  }

  // ---------------------------------------------------------------------------
  // buildFileName
  // ---------------------------------------------------------------------------

  @Test
  void buildsFileNameForUtcTimezone() {
    String name =
        service.buildFileName(
            "TASK_COMPLETION", LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 27), "UTC");
    assertThat(name).isEqualTo("lifeos-task-completion-2026-08-01-to-2026-08-27.csv");
  }

  @Test
  void buildsFileNameIncludingNonUtcTimezone() {
    String name =
        service.buildFileName(
            "TIME_ALLOCATION", LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 27), "Asia/Kolkata");
    assertThat(name).contains("Asia-Kolkata");
    assertThat(name).endsWith(".csv");
  }

  // ---------------------------------------------------------------------------
  // generateCsv — structure and BOM
  // ---------------------------------------------------------------------------

  @Test
  void generatedCsvStartsWithUtf8Bom() throws IOException {
    NamedReportResult result = buildResult();
    InputStream is = service.generateCsv(result);
    byte[] start = is.readNBytes(3);
    assertThat(start).containsExactly(0xEF, 0xBB, 0xBF);
  }

  @Test
  void generatedCsvContainsMetadataHeader() throws IOException {
    NamedReportResult result = buildResult();
    String csv = readCsvContent(result);
    assertThat(csv).contains("# LifeOS Report:");
    assertThat(csv).contains("# Report Type: TASK_COMPLETION");
    assertThat(csv).contains("# Period: 2026-08-01 to 2026-08-27");
    assertThat(csv).contains("# Timezone: UTC");
    assertThat(csv).contains("# Metric Dictionary: v1.0.0");
  }

  @Test
  void generatedCsvContainsSummaryMetricsSection() throws IOException {
    NamedReportResult result = buildResult();
    String csv = readCsvContent(result);
    assertThat(csv).contains("-- Summary Metrics --");
    assertThat(csv).contains("Metric Key,Name,Value,Unit,Comparison,Status");
    assertThat(csv).contains("TASK_TOTAL_COUNT");
  }

  @Test
  void generatedCsvContainsTableSection() throws IOException {
    NamedReportResult result = buildResult();
    String csv = readCsvContent(result);
    assertThat(csv).contains("-- Task Status Breakdown --");
    assertThat(csv).contains("Metric,Count,Percentage");
  }

  @Test
  void generatedCsvProtectsFormulaInTableRow() throws IOException {
    ReportTableData tableWithFormula =
        new ReportTableData(
            "formula-table",
            "Formula Test",
            "Checks injection protection",
            List.of("Column"),
            List.of(List.of("=EVIL()")),
            1);
    NamedReportResult result = buildResultWith(List.of(), List.of(tableWithFormula));
    String csv = readCsvContent(result);
    assertThat(csv).contains("'=EVIL()");
  }

  @Test
  void computeCsvByteLengthMatchesActualLength() throws IOException {
    NamedReportResult result = buildResult();
    long computed = service.computeCsvByteLength(result);
    InputStream is = service.generateCsv(result);
    long actual = is.readAllBytes().length;
    assertThat(computed).isEqualTo(actual);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private String readCsvContent(NamedReportResult result) throws IOException {
    InputStream is = service.generateCsv(result);
    byte[] bytes = is.readAllBytes();
    // Skip UTF-8 BOM (3 bytes)
    return new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);
  }

  private NamedReportResult buildResult() {
    List<ReportMetric> metrics =
        List.of(
            new ReportMetric("TASK_TOTAL_COUNT", "Total Tasks", "10", 10.0, "tasks", null, "OK"));
    List<ReportTableData> tables =
        List.of(
            new ReportTableData(
                "task-status-breakdown",
                "Task Status Breakdown",
                "Summary of tasks by status.",
                List.of("Metric", "Count", "Percentage"),
                List.of(
                    List.of("Total Tasks", 10, "100.0%"), List.of("Completed Tasks", 7, "70.0%")),
                2));
    return buildResultWith(metrics, tables);
  }

  private NamedReportResult buildResultWith(
      List<ReportMetric> metrics, List<ReportTableData> tables) {
    return new NamedReportResult(
        NamedReportType.TASK_COMPLETION,
        "Task Completion & Productivity Report",
        "Test description.",
        "1.0.0",
        Instant.parse("2026-08-27T10:00:00Z"),
        "UTC",
        LocalDate.of(2026, 8, 1),
        LocalDate.of(2026, 8, 27),
        null,
        null,
        null,
        false,
        90,
        null,
        "COMPLETED",
        "Summary text.",
        metrics,
        tables,
        List.of(
            new ReportChartSeriesData(
                "task-chart",
                "Task Distribution",
                ReportChartType.BAR,
                "Status",
                "Count",
                List.of())));
  }
}
