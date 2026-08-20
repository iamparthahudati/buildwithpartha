package tech.buildwithpartha.lifeos.task.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.Date;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.time.LocalDate;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tech.buildwithpartha.lifeos.testsupport.PostgreSqlTestContainerFactory;

class TaskSchemaIT {

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
  void allTaskTablesExistAfterMigration() throws Exception {
    String[] tables = {"tasks", "subtasks"};

    try (Connection conn = connection()) {
      for (String table : tables) {
        try (PreparedStatement ps =
            conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.tables"
                    + " WHERE table_schema = 'public' AND table_name = ?")) {
          ps.setString(1, table);
          try (ResultSet rs = ps.executeQuery()) {
            assertThat(rs.next()).isTrue();
            assertThat(rs.getInt(1)).as("table '%s' must exist after V9 migration", table).isOne();
          }
        }
      }
    }
  }

  @Test
  void rejectsInvalidTaskStatus() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "task-status@example.test");

    try (Connection conn = connection()) {
      assertThatThrownBy(
              () ->
                  insertTask(
                      conn,
                      UUID.randomUUID(),
                      userId,
                      null,
                      "Task Title",
                      "INVALID_STATUS",
                      "P2",
                      0,
                      0,
                      0,
                      null,
                      null))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_tasks_status");
    }
  }

  @Test
  void rejectsInvalidTaskPriority() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "task-priority@example.test");

    try (Connection conn = connection()) {
      assertThatThrownBy(
              () ->
                  insertTask(
                      conn,
                      UUID.randomUUID(),
                      userId,
                      null,
                      "Task Title",
                      "TO_DO",
                      "P9",
                      0,
                      0,
                      0,
                      null,
                      null))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_tasks_priority");
    }
  }

  @Test
  void rejectsProgressOutOfRange() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "task-progress@example.test");

    try (Connection conn = connection()) {
      assertThatThrownBy(
              () ->
                  insertTask(
                      conn,
                      UUID.randomUUID(),
                      userId,
                      null,
                      "Task Title",
                      "TO_DO",
                      "P2",
                      0,
                      0,
                      150,
                      null,
                      null))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_tasks_progress");
    }
  }

  @Test
  void enforcesUniqueActiveMitPerUserAndLocalDate() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "task-mit@example.test");
    LocalDate mitDate = LocalDate.of(2026, 8, 21);

    try (Connection conn = connection()) {
      insertTask(
          conn,
          UUID.randomUUID(),
          userId,
          null,
          "First MIT Task",
          "TO_DO",
          "P1",
          0,
          0,
          0,
          mitDate,
          null);

      assertThatThrownBy(
              () ->
                  insertTask(
                      conn,
                      UUID.randomUUID(),
                      userId,
                      null,
                      "Second MIT Task",
                      "TO_DO",
                      "P2",
                      0,
                      0,
                      0,
                      mitDate,
                      null))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("uq_tasks_user_mit_date");
    }
  }

  @Test
  void allowsMultipleDeletedTasksWithSameMitDate() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "task-mit-deleted@example.test");
    LocalDate mitDate = LocalDate.of(2026, 8, 21);

    try (Connection conn = connection()) {
      insertTask(
          conn,
          UUID.randomUUID(),
          userId,
          null,
          "Deleted MIT Task 1",
          "TO_DO",
          "P1",
          0,
          0,
          0,
          mitDate,
          java.sql.Timestamp.valueOf("2026-08-21 00:00:00"));

      insertTask(
          conn,
          UUID.randomUUID(),
          userId,
          null,
          "Deleted MIT Task 2",
          "TO_DO",
          "P2",
          0,
          0,
          0,
          mitDate,
          java.sql.Timestamp.valueOf("2026-08-21 01:00:00"));

      insertTask(
          conn,
          UUID.randomUUID(),
          userId,
          null,
          "Active MIT Task",
          "TO_DO",
          "P1",
          0,
          0,
          0,
          mitDate,
          null);
    }
  }

  @Test
  void cascadesUserDeletionToTasks() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "cascade-task-user@example.test");
    UUID taskId = UUID.randomUUID();

    try (Connection conn = connection()) {
      insertTask(conn, taskId, userId, null, "User Task", "TO_DO", "P2", 0, 0, 0, null, null);

      try (PreparedStatement deleteUser = conn.prepareStatement("DELETE FROM users WHERE id = ?")) {
        deleteUser.setObject(1, userId);
        deleteUser.executeUpdate();
      }

      try (PreparedStatement checkTask =
          conn.prepareStatement("SELECT COUNT(*) FROM tasks WHERE id = ?")) {
        checkTask.setObject(1, taskId);
        try (ResultSet rs = checkTask.executeQuery()) {
          assertThat(rs.next()).isTrue();
          assertThat(rs.getInt(1)).isZero();
        }
      }
    }
  }

  @Test
  void setsNullProjectIdWhenProjectIsDeleted() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "project-delete-task@example.test");
    UUID projectId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();

    try (Connection conn = connection()) {
      insertProject(conn, projectId, userId, "Project To Delete");
      insertTask(
          conn, taskId, userId, projectId, "Linked Task", "TO_DO", "P2", 0, 0, 0, null, null);

      try (PreparedStatement deleteProject =
          conn.prepareStatement("DELETE FROM projects WHERE id = ?")) {
        deleteProject.setObject(1, projectId);
        deleteProject.executeUpdate();
      }

      try (PreparedStatement checkTask =
          conn.prepareStatement("SELECT project_id FROM tasks WHERE id = ?")) {
        checkTask.setObject(1, taskId);
        try (ResultSet rs = checkTask.executeQuery()) {
          assertThat(rs.next()).isTrue();
          assertThat(rs.getObject("project_id")).isNull();
        }
      }
    }
  }

  @Test
  void cascadesTaskDeletionToSubtasks() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "cascade-subtask@example.test");
    UUID taskId = UUID.randomUUID();
    UUID subtaskId = UUID.randomUUID();

    try (Connection conn = connection()) {
      insertTask(conn, taskId, userId, null, "Parent Task", "TO_DO", "P2", 0, 0, 0, null, null);
      insertSubtask(conn, subtaskId, taskId, "Subtask Item", false, 0);

      try (PreparedStatement deleteTask = conn.prepareStatement("DELETE FROM tasks WHERE id = ?")) {
        deleteTask.setObject(1, taskId);
        deleteTask.executeUpdate();
      }

      try (PreparedStatement checkSubtask =
          conn.prepareStatement("SELECT COUNT(*) FROM subtasks WHERE id = ?")) {
        checkSubtask.setObject(1, subtaskId);
        try (ResultSet rs = checkSubtask.executeQuery()) {
          assertThat(rs.next()).isTrue();
          assertThat(rs.getInt(1)).isZero();
        }
      }
    }
  }

  private static Connection connection() throws Exception {
    return DriverManager.getConnection(jdbcUrl, username, password);
  }

  private static void insertUser(UUID id, String email) throws Exception {
    String uniqueEmail = email.replace("@", "-" + UUID.randomUUID() + "@");
    try (Connection conn = connection();
        PreparedStatement ps =
            conn.prepareStatement(
                "INSERT INTO users(id, email, email_normalized, display_name, time_zone,"
                    + " locale) VALUES (?, ?, ?, ?, 'UTC', 'en')")) {
      ps.setObject(1, id);
      ps.setString(2, uniqueEmail);
      ps.setString(3, uniqueEmail);
      ps.setString(4, "Test User");
      ps.executeUpdate();
    }
  }

  private static void insertProject(Connection conn, UUID id, UUID userId, String name)
      throws Exception {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO projects(id, user_id, name, status, priority, health) VALUES (?, ?, ?,"
                + " 'ACTIVE', 'P2', 'NOT_SET')")) {
      ps.setObject(1, id);
      ps.setObject(2, userId);
      ps.setString(3, name);
      ps.executeUpdate();
    }
  }

  private static void insertTask(
      Connection conn,
      UUID id,
      UUID userId,
      UUID projectId,
      String title,
      String status,
      String priority,
      int estimateMinutes,
      int spentMinutes,
      int progress,
      LocalDate mitDate,
      java.sql.Timestamp deletedAt)
      throws Exception {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO tasks(id, user_id, project_id, title, status, priority,"
                + " estimate_minutes, spent_minutes, progress, mit_date, deleted_at)"
                + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
      ps.setObject(1, id);
      ps.setObject(2, userId);
      if (projectId != null) {
        ps.setObject(3, projectId);
      } else {
        ps.setNull(3, Types.OTHER);
      }
      ps.setString(4, title);
      ps.setString(5, status);
      ps.setString(6, priority);
      ps.setInt(7, estimateMinutes);
      ps.setInt(8, spentMinutes);
      ps.setInt(9, progress);
      if (mitDate != null) {
        ps.setDate(10, Date.valueOf(mitDate));
      } else {
        ps.setNull(10, Types.DATE);
      }
      if (deletedAt != null) {
        ps.setTimestamp(11, deletedAt);
      } else {
        ps.setNull(11, Types.TIMESTAMP_WITH_TIMEZONE);
      }
      ps.executeUpdate();
    }
  }

  private static void insertSubtask(
      Connection conn, UUID id, UUID taskId, String title, boolean completed, int position)
      throws Exception {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO subtasks(id, task_id, title, completed, position)"
                + " VALUES (?, ?, ?, ?, ?)")) {
      ps.setObject(1, id);
      ps.setObject(2, taskId);
      ps.setString(3, title);
      ps.setBoolean(4, completed);
      ps.setInt(5, position);
      ps.executeUpdate();
    }
  }
}
