package tech.buildwithpartha.lifeos.goal.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tech.buildwithpartha.lifeos.testsupport.PostgreSqlTestContainerFactory;

class GoalSchemaIT {

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
      String localUser = System.getProperty("user.name", "postgres");
      String defaultLocalUrl = "jdbc:postgresql://127.0.0.1:5432/lifeos_test";
      jdbcUrl = System.getenv().getOrDefault("LIFEOS_TEST_DB_URL", defaultLocalUrl);
      username = System.getenv().getOrDefault("LIFEOS_TEST_DB_USER", localUser);
      password = System.getenv().getOrDefault("LIFEOS_TEST_DB_PASSWORD", "");
    }

    try (Connection testConn = connection()) {
      Assumptions.assumeTrue(testConn != null, "PostgreSQL connection required for migration test");
    } catch (Exception e) {
      Assumptions.assumeTrue(
          false, "PostgreSQL is not available (Docker or local): " + e.getMessage());
    }

    try (Connection conn = connection();
        Statement stmt = conn.createStatement()) {
      stmt.execute("CREATE SCHEMA IF NOT EXISTS lifeos_internal");
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

  private static Connection connection() throws SQLException {
    return DriverManager.getConnection(jdbcUrl, username, password);
  }

  @Test
  void goalTablesExistAfterV22Migration() throws Exception {
    try (Connection conn = connection()) {
      assertThat(tableExists(conn, "goals")).isTrue();
      assertThat(tableExists(conn, "goal_check_ins")).isTrue();
      assertThat(tableExists(conn, "goal_links")).isTrue();
    }
  }

  @Test
  void enforcesCheckConstraintsOnGoalsTable() throws Exception {
    UUID userId = insertUser();
    UUID goalId = UUID.randomUUID();

    try (Connection conn = connection()) {
      // Invalid status check
      assertThatThrownBy(
              () ->
                  insertGoal(
                      conn,
                      goalId,
                      userId,
                      "Title",
                      "GENERAL",
                      "PERCENTAGE",
                      100.0,
                      0.0,
                      "INVALID_STATUS",
                      "NONE"))
          .isInstanceOf(SQLException.class);

      // Invalid progress_type check
      assertThatThrownBy(
              () ->
                  insertGoal(
                      conn,
                      goalId,
                      userId,
                      "Title",
                      "GENERAL",
                      "INVALID_TYPE",
                      100.0,
                      0.0,
                      "ACTIVE",
                      "NONE"))
          .isInstanceOf(SQLException.class);

      // Negative current_value check
      assertThatThrownBy(
              () ->
                  insertGoal(
                      conn,
                      goalId,
                      userId,
                      "Title",
                      "GENERAL",
                      "PERCENTAGE",
                      100.0,
                      -10.0,
                      "ACTIVE",
                      "NONE"))
          .isInstanceOf(SQLException.class);
    }
  }

  @Test
  void cascadesDeletionWhenGoalIsDeleted() throws Exception {
    UUID userId = insertUser();
    UUID goalId = UUID.randomUUID();

    try (Connection conn = connection()) {
      insertGoal(
          conn,
          goalId,
          userId,
          "Read Books",
          "LEARNING",
          "PERCENTAGE",
          100.0,
          50.0,
          "ACTIVE",
          "MONTHLY");

      UUID checkInId = UUID.randomUUID();
      insertCheckIn(conn, checkInId, goalId, userId, 25.0);

      UUID linkId = UUID.randomUUID();
      insertGoalLink(conn, linkId, goalId, userId, "PROJECT", UUID.randomUUID());

      assertThat(countRows(conn, "goals", "id = ?", goalId)).isEqualTo(1);
      assertThat(countRows(conn, "goal_check_ins", "id = ?", checkInId)).isEqualTo(1);
      assertThat(countRows(conn, "goal_links", "id = ?", linkId)).isEqualTo(1);

      deleteRow(conn, "goals", "id", goalId);

      assertThat(countRows(conn, "goals", "id = ?", goalId)).isEqualTo(0);
      assertThat(countRows(conn, "goal_check_ins", "id = ?", checkInId)).isEqualTo(0);
      assertThat(countRows(conn, "goal_links", "id = ?", linkId)).isEqualTo(0);
    }
  }

  @Test
  void enforcesUniqueGoalLinkTargetConstraint() throws Exception {
    UUID userId = insertUser();
    UUID goalId = UUID.randomUUID();
    UUID targetId = UUID.randomUUID();

    try (Connection conn = connection()) {
      insertGoal(
          conn,
          goalId,
          userId,
          "Read Books",
          "LEARNING",
          "PERCENTAGE",
          100.0,
          50.0,
          "ACTIVE",
          "MONTHLY");

      insertGoalLink(conn, UUID.randomUUID(), goalId, userId, "PROJECT", targetId);

      assertThatThrownBy(
              () -> insertGoalLink(conn, UUID.randomUUID(), goalId, userId, "PROJECT", targetId))
          .isInstanceOf(SQLException.class);
    }
  }

  private boolean tableExists(Connection conn, String tableName) throws SQLException {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "SELECT COUNT(*) FROM information_schema.tables"
                + " WHERE table_schema = 'public' AND table_name = ?")) {
      ps.setString(1, tableName);
      try (ResultSet rs = ps.executeQuery()) {
        return rs.next() && rs.getInt(1) == 1;
      }
    }
  }

  private UUID insertUser() throws SQLException {
    UUID userId = UUID.randomUUID();
    String uniqueEmail = "user_" + UUID.randomUUID() + "@example.com";
    try (Connection conn = connection();
        PreparedStatement ps =
            conn.prepareStatement(
                "INSERT INTO public.users (id, email, email_normalized, display_name,"
                    + " time_zone, locale, week_start, account_status, version)"
                    + " VALUES (?, ?, ?, 'Test User', 'UTC', 'en-US', 1, 'ACTIVE', 0)")) {
      ps.setObject(1, userId);
      ps.setString(2, uniqueEmail);
      ps.setString(3, uniqueEmail.toLowerCase());
      ps.executeUpdate();
    }
    return userId;
  }

  private void insertGoal(
      Connection conn,
      UUID id,
      UUID userId,
      String title,
      String category,
      String progressType,
      Double targetValue,
      Double currentValue,
      String status,
      String checkInCadence)
      throws SQLException {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO public.goals (id, user_id, title, category, progress_type,"
                + " target_value, current_value, status, check_in_cadence, created_at,"
                + " updated_at, version)"
                + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now(), 0)")) {
      ps.setObject(1, id);
      ps.setObject(2, userId);
      ps.setString(3, title);
      ps.setString(4, category);
      ps.setString(5, progressType);
      if (targetValue != null) {
        ps.setDouble(6, targetValue);
      } else {
        ps.setNull(6, Types.NUMERIC);
      }
      ps.setDouble(7, currentValue);
      ps.setString(8, status);
      ps.setString(9, checkInCadence);
      ps.executeUpdate();
    }
  }

  private void insertCheckIn(Connection conn, UUID id, UUID goalId, UUID userId, Double value)
      throws SQLException {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO public.goal_check_ins (id, goal_id, user_id, value, recorded_at,"
                + " created_at)"
                + " VALUES (?, ?, ?, ?, now(), now())")) {
      ps.setObject(1, id);
      ps.setObject(2, goalId);
      ps.setObject(3, userId);
      ps.setDouble(4, value);
      ps.executeUpdate();
    }
  }

  private void insertGoalLink(
      Connection conn, UUID id, UUID goalId, UUID userId, String targetType, UUID targetId)
      throws SQLException {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO public.goal_links (id, goal_id, user_id, target_type, target_id,"
                + " created_at)"
                + " VALUES (?, ?, ?, ?, ?, now())")) {
      ps.setObject(1, id);
      ps.setObject(2, goalId);
      ps.setObject(3, userId);
      ps.setString(4, targetType);
      ps.setObject(5, targetId);
      ps.executeUpdate();
    }
  }

  private int countRows(Connection conn, String tableName, String whereClause, UUID param)
      throws SQLException {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "SELECT COUNT(*) FROM public." + tableName + " WHERE " + whereClause)) {
      ps.setObject(1, param);
      try (ResultSet rs = ps.executeQuery()) {
        rs.next();
        return rs.getInt(1);
      }
    }
  }

  private void deleteRow(Connection conn, String tableName, String idColumn, UUID id)
      throws SQLException {
    try (PreparedStatement ps =
        conn.prepareStatement("DELETE FROM public." + tableName + " WHERE " + idColumn + " = ?")) {
      ps.setObject(1, id);
      ps.executeUpdate();
    }
  }
}
