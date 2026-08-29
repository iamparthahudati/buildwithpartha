package tech.buildwithpartha.lifeos.habit.infrastructure;

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

class HabitSchemaIT {
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
  void createsHabitTables() throws Exception {
    try (Connection conn = connection();
        PreparedStatement query =
            conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND"
                    + " table_name IN ('habits', 'habit_entries', 'habit_pause_periods')")) {
      try (ResultSet result = query.executeQuery()) {
        assertThat(result.next()).isTrue();
        assertThat(result.getInt(1)).isEqualTo(3);
      }
    }
  }

  @Test
  void enforcesHabitCheckConstraints() throws Exception {
    UUID userId = insertUser();

    assertThatThrownBy(() -> insertHabit(UUID.randomUUID(), userId, "INVALID_CADENCE", 1, "UTC"))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("ck_habits_cadence_type");

    assertThatThrownBy(() -> insertHabit(UUID.randomUUID(), userId, "DAILY", 0, "UTC"))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("ck_habits_target_count_positive");
  }

  @Test
  void enforcesUniqueEntryPerHabitAndLocalDate() throws Exception {
    UUID userId = insertUser();
    UUID habitId = UUID.randomUUID();
    insertHabit(habitId, userId, "DAILY", 1, "UTC");

    insertEntry(UUID.randomUUID(), habitId, userId, "2026-02-01", 1);

    assertThatThrownBy(() -> insertEntry(UUID.randomUUID(), habitId, userId, "2026-02-01", 2))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("uq_habit_entries_habit_local_date");
  }

  @Test
  void enforcesPausePeriodDateOrder() throws Exception {
    UUID userId = insertUser();
    UUID habitId = UUID.randomUUID();
    insertHabit(habitId, userId, "DAILY", 1, "UTC");

    assertThatThrownBy(
            () -> insertPausePeriod(UUID.randomUUID(), habitId, userId, "2026-03-10", "2026-03-01"))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("ck_habit_pause_periods_date_order");
  }

  private static Connection connection() throws SQLException {
    return DriverManager.getConnection(jdbcUrl, username, password);
  }

  private UUID insertUser() throws SQLException {
    UUID id = UUID.randomUUID();
    String email = "user-" + id + "@example.test";
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "INSERT INTO public.users (id, email, email_normalized, display_name, time_zone,"
                    + " locale, week_start, account_status, version) VALUES (?, ?, ?,'Test User',"
                    + " 'UTC', 'en-US', 1, 'ACTIVE', 0)")) {
      statement.setObject(1, id);
      statement.setString(2, email);
      statement.setString(3, email);
      statement.executeUpdate();
    }
    return id;
  }

  private void insertHabit(UUID id, UUID userId, String cadence, int targetCount, String timeZone)
      throws SQLException {
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "INSERT INTO public.habits (id, user_id, name, cadence_type, target_count,"
                    + " time_zone, reminder_enabled, archived, version) VALUES (?, ?, 'Habit', ?,"
                    + " ?, ?, FALSE, FALSE, 0)")) {
      statement.setObject(1, id);
      statement.setObject(2, userId);
      statement.setString(3, cadence);
      statement.setInt(4, targetCount);
      statement.setString(5, timeZone);
      statement.executeUpdate();
    }
  }

  private void insertEntry(UUID id, UUID habitId, UUID userId, String localDate, int count)
      throws SQLException {
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "INSERT INTO public.habit_entries (id, habit_id, user_id, local_date,"
                    + " completed_count, version) VALUES (?, ?, ?, ?::date, ?, 0)")) {
      statement.setObject(1, id);
      statement.setObject(2, habitId);
      statement.setObject(3, userId);
      statement.setString(4, localDate);
      statement.setInt(5, count);
      statement.executeUpdate();
    }
  }

  private void insertPausePeriod(
      UUID id, UUID habitId, UUID userId, String startDate, String endDate) throws SQLException {
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "INSERT INTO public.habit_pause_periods (id, habit_id, user_id, start_date,"
                    + " end_date) VALUES (?, ?, ?, ?::date, ?::date)")) {
      statement.setObject(1, id);
      statement.setObject(2, habitId);
      statement.setObject(3, userId);
      statement.setString(4, startDate);
      statement.setString(5, endDate);
      statement.executeUpdate();
    }
  }
}
