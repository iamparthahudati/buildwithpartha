package tech.buildwithpartha.lifeos.common.database;

import static org.assertj.core.api.Assertions.assertThat;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.metrics.MetricsService;

class DatabaseQueryTuningTests {

  private MeterRegistry registry;
  private MetricsService metricsService;
  private DatabaseQueryPerformanceMonitor monitor;

  @BeforeEach
  void setUp() {
    registry = new SimpleMeterRegistry();
    metricsService = new MetricsService(registry);
    monitor = new DatabaseQueryPerformanceMonitor(metricsService);
  }

  @Test
  @DisplayName("records normal query execution without triggering slow query warning threshold")
  void recordsNormalQueryExecution() {
    long duration = monitor.recordQueryExecution("tasks_query", 45L);

    assertThat(duration).isEqualTo(45L);
    assertThat(monitor.getSlowQueryCount()).isEqualTo(0L);

    Timer timer = registry.find("lifeos.db.query.duration").tag("slow", "false").timer();
    assertThat(timer).isNotNull();
    assertThat(timer.count()).isEqualTo(1L);
  }

  @Test
  @DisplayName(
      "triggers slow query counter and warning metric when execution time exceeds threshold")
  void recordsSlowQueryExecution() {
    long duration = monitor.recordQueryExecution("reports_progress_query", 550L);

    assertThat(duration).isEqualTo(550L);
    assertThat(monitor.getSlowQueryCount()).isEqualTo(1L);

    Timer timer = registry.find("lifeos.db.query.duration").tag("slow", "true").timer();
    assertThat(timer).isNotNull();
    assertThat(timer.count()).isEqualTo(1L);
  }

  @Test
  @DisplayName("verifies Flyway V34 schema migration contains required database indexes")
  void verifiesV34FlywayMigrationIndexes() throws Exception {
    try (InputStream is =
        getClass().getResourceAsStream("/db/migration/V34__tune_queries_and_indexes.sql")) {
      assertThat(is).isNotNull();
      String script = new String(is.readAllBytes(), StandardCharsets.UTF_8);

      assertThat(script).contains("CREATE INDEX IF NOT EXISTS ix_tasks_user_project_status");
      assertThat(script).contains("CREATE INDEX IF NOT EXISTS ix_tasks_user_updated");
      assertThat(script).contains("CREATE INDEX IF NOT EXISTS ix_tasks_user_archived");
      assertThat(script).contains("CREATE INDEX IF NOT EXISTS ix_projects_user_updated");
      assertThat(script).contains("CREATE INDEX IF NOT EXISTS ix_projects_user_archived");
      assertThat(script).contains("CREATE INDEX IF NOT EXISTS ix_notes_user_updated");
      assertThat(script).contains("CREATE INDEX IF NOT EXISTS ix_notes_user_pinned_updated");
      assertThat(script).contains("CREATE INDEX IF NOT EXISTS ix_habit_entries_user_date");
      assertThat(script).contains("CREATE INDEX IF NOT EXISTS ix_time_blocks_user_status_start");
    }
  }

  @Test
  @DisplayName("resets slow query counter correctly")
  void resetsSlowQueryCounter() {
    monitor.recordQueryExecution("slow_op", 600L);
    assertThat(monitor.getSlowQueryCount()).isEqualTo(1L);

    monitor.resetSlowQueryCount();
    assertThat(monitor.getSlowQueryCount()).isEqualTo(0L);
  }
}
