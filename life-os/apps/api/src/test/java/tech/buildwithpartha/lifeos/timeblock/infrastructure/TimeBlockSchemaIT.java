package tech.buildwithpartha.lifeos.timeblock.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tech.buildwithpartha.lifeos.testsupport.PostgreSqlTestContainerFactory;

class TimeBlockSchemaIT {

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

  @Test
  void timeBlocksTableExistsAfterMigration() throws Exception {
    try (Connection conn = connection();
        PreparedStatement ps =
            conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.tables"
                    + " WHERE table_schema = 'public' AND table_name = 'time_blocks'")) {
      try (ResultSet rs = ps.executeQuery()) {
        assertThat(rs.next()).isTrue();
        assertThat(rs.getInt(1)).as("table 'time_blocks' must exist after V15 migration").isOne();
      }
    }
  }

  @Test
  void rejectsInvalidTimeBlockStatus() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "tb-status@example.test");

    try (Connection conn = connection()) {
      assertThatThrownBy(
              () ->
                  insertTimeBlock(
                      conn,
                      UUID.randomUUID(),
                      userId,
                      null,
                      null,
                      "Block Title",
                      "GENERAL",
                      "INVALID_STATUS",
                      Instant.parse("2026-08-24T09:00:00Z"),
                      Instant.parse("2026-08-24T10:00:00Z"),
                      "America/New_York"))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_time_blocks_status");
    }
  }

  @Test
  void rejectsEndAtNotAfterStartAt() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "tb-interval@example.test");

    Instant now = Instant.parse("2026-08-24T09:00:00Z");
    try (Connection conn = connection()) {
      assertThatThrownBy(
              () ->
                  insertTimeBlock(
                      conn,
                      UUID.randomUUID(),
                      userId,
                      null,
                      null,
                      "Block Title",
                      "GENERAL",
                      "SCHEDULED",
                      now,
                      now, // Equal start and end
                      "America/New_York"))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_time_blocks_end_after_start");
    }
  }

  @Test
  void cascadesUserDeletionAndNullifiesProjectAndTaskReferences() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "tb-cascade@example.test");

    UUID projectId = UUID.randomUUID();
    insertProject(projectId, userId, "Linked Project");

    UUID taskId = UUID.randomUUID();
    insertTask(taskId, userId, projectId, "Linked Task");

    UUID timeBlockId = UUID.randomUUID();
    try (Connection conn = connection()) {
      insertTimeBlock(
          conn,
          timeBlockId,
          userId,
          projectId,
          taskId,
          "Linked Block",
          "FOCUS",
          "SCHEDULED",
          Instant.parse("2026-08-24T09:00:00Z"),
          Instant.parse("2026-08-24T10:00:00Z"),
          "UTC");
    }

    // Delete task -> task_id becomes NULL
    try (Connection conn = connection();
        PreparedStatement ps = conn.prepareStatement("DELETE FROM public.tasks WHERE id = ?")) {
      ps.setObject(1, taskId);
      ps.executeUpdate();
    }
    try (Connection conn = connection();
        PreparedStatement ps =
            conn.prepareStatement("SELECT task_id FROM public.time_blocks WHERE id = ?")) {
      ps.setObject(1, timeBlockId);
      try (ResultSet rs = ps.executeQuery()) {
        assertThat(rs.next()).isTrue();
        assertThat(rs.getObject("task_id")).isNull();
      }
    }

    // Delete project -> project_id becomes NULL
    try (Connection conn = connection();
        PreparedStatement ps = conn.prepareStatement("DELETE FROM public.projects WHERE id = ?")) {
      ps.setObject(1, projectId);
      ps.executeUpdate();
    }
    try (Connection conn = connection();
        PreparedStatement ps =
            conn.prepareStatement("SELECT project_id FROM public.time_blocks WHERE id = ?")) {
      ps.setObject(1, timeBlockId);
      try (ResultSet rs = ps.executeQuery()) {
        assertThat(rs.next()).isTrue();
        assertThat(rs.getObject("project_id")).isNull();
      }
    }

    // Delete user -> time_block is deleted
    try (Connection conn = connection();
        PreparedStatement ps = conn.prepareStatement("DELETE FROM public.users WHERE id = ?")) {
      ps.setObject(1, userId);
      ps.executeUpdate();
    }
    try (Connection conn = connection();
        PreparedStatement ps =
            conn.prepareStatement("SELECT COUNT(*) FROM public.time_blocks WHERE id = ?")) {
      ps.setObject(1, timeBlockId);
      try (ResultSet rs = ps.executeQuery()) {
        assertThat(rs.next()).isTrue();
        assertThat(rs.getInt(1)).isZero();
      }
    }
  }

  private static Connection connection() throws SQLException {
    return DriverManager.getConnection(jdbcUrl, username, password);
  }

  private static void insertUser(UUID userId, String email) throws SQLException {
    String uniqueEmail = email.replace("@", "-" + UUID.randomUUID() + "@");
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
  }

  private static void insertProject(UUID projectId, UUID userId, String name) throws SQLException {
    try (Connection conn = connection();
        PreparedStatement ps =
            conn.prepareStatement(
                "INSERT INTO public.projects (id, user_id, name, status, priority, health,"
                    + " version) VALUES (?, ?, ?, 'PLANNED', 'P2', 'NOT_SET', 0)")) {
      ps.setObject(1, projectId);
      ps.setObject(2, userId);
      ps.setString(3, name);
      ps.executeUpdate();
    }
  }

  private static void insertTask(UUID taskId, UUID userId, UUID projectId, String title)
      throws SQLException {
    try (Connection conn = connection();
        PreparedStatement ps =
            conn.prepareStatement(
                "INSERT INTO public.tasks (id, user_id, project_id, title, status, priority,"
                    + " estimate_minutes, spent_minutes, progress, position, version) VALUES (?,"
                    + " ?, ?, ?, 'TO_DO', 'P2', 0, 0, 0, 0, 0)")) {
      ps.setObject(1, taskId);
      ps.setObject(2, userId);
      if (projectId != null) {
        ps.setObject(3, projectId);
      } else {
        ps.setNull(3, Types.OTHER);
      }
      ps.setString(4, title);
      ps.executeUpdate();
    }
  }

  private static void insertTimeBlock(
      Connection conn,
      UUID id,
      UUID userId,
      UUID projectId,
      UUID taskId,
      String title,
      String category,
      String status,
      Instant startAt,
      Instant endAt,
      String sourceTimeZone)
      throws SQLException {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO public.time_blocks (id, user_id, project_id, task_id, title, category,"
                + " status, start_at, end_at, source_time_zone, version) VALUES (?, ?, ?, ?, ?, ?,"
                + " ?, ?, ?, ?, 0)")) {
      ps.setObject(1, id);
      ps.setObject(2, userId);
      if (projectId != null) {
        ps.setObject(3, projectId);
      } else {
        ps.setNull(3, Types.OTHER);
      }
      if (taskId != null) {
        ps.setObject(4, taskId);
      } else {
        ps.setNull(4, Types.OTHER);
      }
      ps.setString(5, title);
      ps.setString(6, category);
      ps.setString(7, status);
      ps.setTimestamp(8, Timestamp.from(startAt));
      ps.setTimestamp(9, Timestamp.from(endAt));
      ps.setString(10, sourceTimeZone);
      ps.executeUpdate();
    }
  }
}
