package tech.buildwithpartha.lifeos.task.infrastructure;

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

class RecurringTaskSchemaIT {
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
  void createsRecurringTaskTables() throws Exception {
    try (Connection conn = connection();
        PreparedStatement query =
            conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND"
                    + " table_name IN ('recurring_task_series', 'recurring_task_exceptions')")) {
      try (ResultSet result = query.executeQuery()) {
        assertThat(result.next()).isTrue();
        assertThat(result.getInt(1)).isEqualTo(2);
      }
    }
  }

  @Test
  void verifiesTasksRecurrenceColumnsExist() throws Exception {
    try (Connection conn = connection();
        PreparedStatement query =
            conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND"
                    + " table_name = 'tasks' AND column_name IN ('recurring_series_id',"
                    + " 'recurrence_occurrence_date')")) {
      try (ResultSet result = query.executeQuery()) {
        assertThat(result.next()).isTrue();
        assertThat(result.getInt(1)).isEqualTo(2);
      }
    }
  }

  @Test
  void enforcesFrequencyCheckConstraint() throws Exception {
    UUID userId = insertUser();

    assertThatThrownBy(
            () ->
                insertSeries(
                    UUID.randomUUID(), userId, "Invalid Frequency", "INVALID_FREQ", "NEVER", "UTC"))
        .isInstanceOf(SQLException.class);
  }

  private static Connection connection() throws SQLException {
    return DriverManager.getConnection(jdbcUrl, username, password);
  }

  private UUID insertUser() throws SQLException {
    UUID id = UUID.randomUUID();
    String email = "recurring-test-" + id + "@example.test";
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "INSERT INTO public.users (id, email, email_normalized, display_name, time_zone,"
                    + " locale, week_start, account_status, version) VALUES (?, ?, ?, 'Test User',"
                    + " 'UTC', 'en-US', 1, 'ACTIVE', 0)")) {
      statement.setObject(1, id);
      statement.setString(2, email);
      statement.setString(3, email);
      statement.executeUpdate();
    }
    return id;
  }

  private void insertSeries(
      UUID id, UUID userId, String title, String frequency, String endMode, String timeZone)
      throws SQLException {
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "INSERT INTO public.recurring_task_series (id, user_id, title, frequency,"
                    + " end_mode, start_date, time_zone) VALUES (?, ?, ?, ?, ?, CURRENT_DATE,"
                    + " ?)")) {
      statement.setObject(1, id);
      statement.setObject(2, userId);
      statement.setString(3, title);
      statement.setString(4, frequency);
      statement.setString(5, endMode);
      statement.setString(6, timeZone);
      statement.executeUpdate();
    }
  }
}
