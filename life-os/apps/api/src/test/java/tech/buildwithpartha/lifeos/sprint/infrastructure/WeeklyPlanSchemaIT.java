package tech.buildwithpartha.lifeos.sprint.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tech.buildwithpartha.lifeos.testsupport.PostgreSqlTestContainerFactory;

class WeeklyPlanSchemaIT {
  @SuppressWarnings("rawtypes")
  private static PostgreSQLContainer container;

  private static String jdbcUrl;
  private static String username;
  private static String password;

  @BeforeAll
  static void setUpAndMigrate() throws Exception {
    boolean dockerAvailable = false;
    try {
      dockerAvailable = DockerClientFactory.instance().isDockerAvailable();
    } catch (Exception ignored) {
      // Docker is unavailable in this environment.
    }
    if (dockerAvailable) {
      container = PostgreSqlTestContainerFactory.create();
      container.start();
      jdbcUrl = container.getJdbcUrl();
      username = container.getUsername();
      password = container.getPassword();
    } else {
      jdbcUrl =
          System.getenv()
              .getOrDefault("LIFEOS_TEST_DB_URL", "jdbc:postgresql://127.0.0.1:5432/lifeos_test");
      username =
          System.getenv()
              .getOrDefault("LIFEOS_TEST_DB_USER", System.getProperty("user.name", "postgres"));
      password = System.getenv().getOrDefault("LIFEOS_TEST_DB_PASSWORD", "");
    }
    try (Connection ignored = connection()) {
      // Connection is required for this real PostgreSQL constraint test.
    } catch (Exception exception) {
      Assumptions.assumeTrue(false, "PostgreSQL is unavailable: " + exception.getMessage());
    }
    try (Connection conn = connection();
        Statement statement = conn.createStatement()) {
      statement.execute("CREATE SCHEMA IF NOT EXISTS lifeos_internal");
    }
    Flyway.configure()
        .dataSource(jdbcUrl, username, password)
        .schemas("lifeos_internal", "public")
        .defaultSchema("lifeos_internal")
        .table("lifeos_schema_history")
        .locations("classpath:db/migration")
        .load()
        .migrate();
  }

  @AfterAll
  static void tearDown() {
    if (container != null) {
      container.stop();
    }
  }

  @Test
  void createsWeeklyPlanTablesAndEnforcesOneDraftPerAccountWeek() throws Exception {
    try (Connection conn = connection();
        PreparedStatement query =
            conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.tables"
                    + " WHERE table_schema = 'public' AND table_name LIKE 'weekly_plan%'")) {
      try (ResultSet result = query.executeQuery()) {
        assertThat(result.next()).isTrue();
        assertThat(result.getInt(1)).isEqualTo(4);
      }
    }
    UUID userId = insertUser();
    insertPlan(UUID.randomUUID(), userId, "2027-04-05", 1, "DRAFT", false);
    assertThatThrownBy(() -> insertPlan(UUID.randomUUID(), userId, "2027-04-05", 2, "DRAFT", false))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("uq_weekly_plans_one_draft_per_week");
  }

  @Test
  void rejectsCrossAccountTaskAllocationAtTheDatabaseBoundary() throws Exception {
    UUID planOwner = insertUser();
    UUID taskOwner = insertUser();
    UUID planId = UUID.randomUUID();
    UUID taskId = insertTask(taskOwner);
    insertPlan(planId, planOwner, "2027-05-03", 1, "DRAFT", false);

    assertThatThrownBy(
            () -> {
              try (Connection conn = connection();
                  PreparedStatement insert =
                      conn.prepareStatement(
                          "INSERT INTO public.weekly_plan_items"
                              + " (id, weekly_plan_id, user_id, task_id, planned_minutes,"
                              + " position, task_title_snapshot, task_status_snapshot)"
                              + " VALUES (?, ?, ?, ?, 30, 0, 'Private task', 'TO_DO')")) {
                insert.setObject(1, UUID.randomUUID());
                insert.setObject(2, planId);
                insert.setObject(3, planOwner);
                insert.setObject(4, taskId);
                insert.executeUpdate();
              }
            })
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("fk_weekly_plan_items_owned_task");
  }

  @Test
  void requiresFinalizedPlansToCarryACompleteConflictSnapshot() throws Exception {
    UUID userId = insertUser();
    assertThatThrownBy(
            () -> insertPlan(UUID.randomUUID(), userId, "2027-06-07", 1, "FINALIZED", false))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("ck_weekly_plans_finalization");
    insertPlan(UUID.randomUUID(), userId, "2027-06-07", 2, "FINALIZED", true);
  }

  private static UUID insertUser() throws SQLException {
    UUID id = UUID.randomUUID();
    String email = "weekly-plan-" + id + "@example.test";
    try (Connection conn = connection();
        PreparedStatement insert =
            conn.prepareStatement(
                "INSERT INTO public.users (id, email, email_normalized, display_name,"
                    + " time_zone, locale, week_start, account_status, version)"
                    + " VALUES (?, ?, ?, 'Planner', 'UTC', 'en-US', 1, 'ACTIVE', 0)")) {
      insert.setObject(1, id);
      insert.setString(2, email);
      insert.setString(3, email);
      insert.executeUpdate();
    }
    return id;
  }

  private static UUID insertTask(UUID userId) throws SQLException {
    UUID id = UUID.randomUUID();
    try (Connection conn = connection();
        PreparedStatement insert =
            conn.prepareStatement(
                "INSERT INTO public.tasks (id, user_id, title, status, priority,"
                    + " estimate_minutes, spent_minutes, progress, position, version)"
                    + " VALUES (?, ?, 'Private task', 'TO_DO', 'P2', 30, 0, 0, 0, 0)")) {
      insert.setObject(1, id);
      insert.setObject(2, userId);
      insert.executeUpdate();
    }
    return id;
  }

  private static void insertPlan(
      UUID id, UUID userId, String startDate, int revision, String status, boolean withSnapshot)
      throws SQLException {
    String sql =
        "INSERT INTO public.weekly_plans (id, user_id, week_start_date, week_end_date,"
            + " time_zone, week_start_day, revision, status, finalized_at,"
            + " snapshot_total_planned_minutes, snapshot_total_capacity_minutes,"
            + " snapshot_overcapacity_minutes, snapshot_overlapping_time_block_count,"
            + " snapshot_unscheduled_item_count, snapshot_outcomes_without_items_count, version)"
            + " VALUES (?, ?, ?::date, ?::date + 6, 'UTC', 1, ?, ?,"
            + (withSnapshot
                ? " now(), 0, 0, 0, 0, 0, 0, 0)"
                : " NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0)");
    try (Connection conn = connection();
        PreparedStatement insert = conn.prepareStatement(sql)) {
      insert.setObject(1, id);
      insert.setObject(2, userId);
      insert.setString(3, startDate);
      insert.setString(4, startDate);
      insert.setInt(5, revision);
      insert.setString(6, status);
      insert.executeUpdate();
    }
  }

  private static Connection connection() throws SQLException {
    return DriverManager.getConnection(jdbcUrl, username, password);
  }
}
