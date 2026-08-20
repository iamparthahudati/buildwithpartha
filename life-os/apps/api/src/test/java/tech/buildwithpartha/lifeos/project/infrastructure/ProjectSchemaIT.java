package tech.buildwithpartha.lifeos.project.infrastructure;

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

class ProjectSchemaIT {

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
  void allProjectTablesExistAfterMigration() throws Exception {
    String[] tables = {"labels", "projects", "project_labels", "milestones"};

    try (Connection conn = connection()) {
      for (String table : tables) {
        try (PreparedStatement ps =
            conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.tables"
                    + " WHERE table_schema = 'public' AND table_name = ?")) {
          ps.setString(1, table);
          try (ResultSet rs = ps.executeQuery()) {
            assertThat(rs.next()).isTrue();
            assertThat(rs.getInt(1)).as("table '%s' must exist after V8 migration", table).isOne();
          }
        }
      }
    }
  }

  @Test
  void rejectsDuplicateLabelNormalizedNamePerUser() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "lbl-dup@example.test");

    try (Connection conn = connection()) {
      insertLabel(conn, UUID.randomUUID(), userId, "Work", "work");

      assertThatThrownBy(() -> insertLabel(conn, UUID.randomUUID(), userId, "WORK", "work"))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("uq_labels_user_name_normalized");
    }
  }

  @Test
  void allowsDuplicateLabelNormalizedNameAcrossDifferentUsers() throws Exception {
    UUID userA = UUID.randomUUID();
    UUID userB = UUID.randomUUID();
    insertUser(userA, "userA@example.test");
    insertUser(userB, "userB@example.test");

    try (Connection conn = connection()) {
      insertLabel(conn, UUID.randomUUID(), userA, "Personal", "personal");
      insertLabel(conn, UUID.randomUUID(), userB, "personal", "personal");
      // Should complete without constraint violation
    }
  }

  @Test
  void rejectsInvalidProjectStatus() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "proj-status@example.test");

    try (Connection conn = connection()) {
      assertThatThrownBy(
              () ->
                  insertProject(
                      conn,
                      UUID.randomUUID(),
                      userId,
                      "Project",
                      "INVALID_STATUS",
                      "P2",
                      "NOT_SET",
                      null,
                      null))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_projects_status");
    }
  }

  @Test
  void rejectsInvalidProjectPriority() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "proj-priority@example.test");

    try (Connection conn = connection()) {
      assertThatThrownBy(
              () ->
                  insertProject(
                      conn,
                      UUID.randomUUID(),
                      userId,
                      "Project",
                      "PLANNED",
                      "P5",
                      "NOT_SET",
                      null,
                      null))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_projects_priority");
    }
  }

  @Test
  void rejectsInvalidProjectHealth() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "proj-health@example.test");

    try (Connection conn = connection()) {
      assertThatThrownBy(
              () ->
                  insertProject(
                      conn,
                      UUID.randomUUID(),
                      userId,
                      "Project",
                      "PLANNED",
                      "P2",
                      "SUPER_GOOD",
                      null,
                      null))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_projects_health");
    }
  }

  @Test
  void rejectsDeadlineBeforeStartDate() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "proj-dates@example.test");

    LocalDate start = LocalDate.of(2026, 8, 20);
    LocalDate end = LocalDate.of(2026, 8, 19);

    try (Connection conn = connection()) {
      assertThatThrownBy(
              () ->
                  insertProject(
                      conn,
                      UUID.randomUUID(),
                      userId,
                      "Project",
                      "PLANNED",
                      "P2",
                      "NOT_SET",
                      start,
                      end))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_projects_deadline");
    }
  }

  @Test
  void acceptsDeadlineOnOrAfterStartDate() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "proj-dates-ok@example.test");

    LocalDate start = LocalDate.of(2026, 8, 20);
    LocalDate end = LocalDate.of(2026, 8, 20);

    try (Connection conn = connection()) {
      insertProject(
          conn, UUID.randomUUID(), userId, "Project", "PLANNED", "P2", "NOT_SET", start, end);
      insertProject(
          conn,
          UUID.randomUUID(),
          userId,
          "Project 2",
          "PLANNED",
          "P2",
          "NOT_SET",
          start,
          start.plusDays(10));
    }
  }

  @Test
  void rejectsInvalidMilestoneStatus() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "ms-status@example.test");
    UUID projectId = UUID.randomUUID();

    try (Connection conn = connection()) {
      insertProject(
          conn, projectId, userId, "Project with MS", "PLANNED", "P2", "NOT_SET", null, null);
      assertThatThrownBy(
              () ->
                  insertMilestone(conn, UUID.randomUUID(), projectId, "MS Title", "INVALID_STATUS"))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_milestones_status");
    }
  }

  @Test
  void cascadesUserDeletionToLabelsAndProjects() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "cascade-user@example.test");
    UUID labelId = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();

    try (Connection conn = connection()) {
      insertLabel(conn, labelId, userId, "Work", "work");
      insertProject(
          conn, projectId, userId, "Project to delete", "PLANNED", "P2", "NOT_SET", null, null);

      try (PreparedStatement deleteUser = conn.prepareStatement("DELETE FROM users WHERE id = ?")) {
        deleteUser.setObject(1, userId);
        deleteUser.executeUpdate();
      }

      // Verify label is deleted
      try (PreparedStatement checkLabel =
          conn.prepareStatement("SELECT COUNT(*) FROM labels WHERE id = ?")) {
        checkLabel.setObject(1, labelId);
        try (ResultSet rs = checkLabel.executeQuery()) {
          assertThat(rs.next()).isTrue();
          assertThat(rs.getInt(1)).isZero();
        }
      }

      // Verify project is deleted
      try (PreparedStatement checkProject =
          conn.prepareStatement("SELECT COUNT(*) FROM projects WHERE id = ?")) {
        checkProject.setObject(1, projectId);
        try (ResultSet rs = checkProject.executeQuery()) {
          assertThat(rs.next()).isTrue();
          assertThat(rs.getInt(1)).isZero();
        }
      }
    }
  }

  @Test
  void cascadesProjectDeletionToMilestonesAndProjectLabels() throws Exception {
    UUID userId = UUID.randomUUID();
    insertUser(userId, "cascade-proj@example.test");
    UUID labelId = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();
    UUID milestoneId = UUID.randomUUID();

    try (Connection conn = connection()) {
      insertLabel(conn, labelId, userId, "Work", "work");
      insertProject(conn, projectId, userId, "Project", "PLANNED", "P2", "NOT_SET", null, null);
      insertProjectLabelLink(conn, projectId, labelId);
      insertMilestone(conn, milestoneId, projectId, "Milestone", "PLANNED");

      try (PreparedStatement deleteProject =
          conn.prepareStatement("DELETE FROM projects WHERE id = ?")) {
        deleteProject.setObject(1, projectId);
        deleteProject.executeUpdate();
      }

      // Verify milestone is deleted
      try (PreparedStatement checkMs =
          conn.prepareStatement("SELECT COUNT(*) FROM milestones WHERE id = ?")) {
        checkMs.setObject(1, milestoneId);
        try (ResultSet rs = checkMs.executeQuery()) {
          assertThat(rs.next()).isTrue();
          assertThat(rs.getInt(1)).isZero();
        }
      }

      // Verify project_labels link is deleted
      try (PreparedStatement checkLink =
          conn.prepareStatement("SELECT COUNT(*) FROM project_labels WHERE project_id = ?")) {
        checkLink.setObject(1, projectId);
        try (ResultSet rs = checkLink.executeQuery()) {
          assertThat(rs.next()).isTrue();
          assertThat(rs.getInt(1)).isZero();
        }
      }

      // Verify label itself still exists
      try (PreparedStatement checkLabel =
          conn.prepareStatement("SELECT COUNT(*) FROM labels WHERE id = ?")) {
        checkLabel.setObject(1, labelId);
        try (ResultSet rs = checkLabel.executeQuery()) {
          assertThat(rs.next()).isTrue();
          assertThat(rs.getInt(1)).isOne();
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
                "INSERT INTO users(id, email, email_normalized, display_name, time_zone, locale)"
                    + " VALUES (?, ?, ?, ?, 'UTC', 'en')")) {
      ps.setObject(1, id);
      ps.setString(2, uniqueEmail);
      ps.setString(3, uniqueEmail);
      ps.setString(4, "Test User");
      ps.executeUpdate();
    }
  }

  private static void insertLabel(
      Connection conn, UUID id, UUID userId, String name, String nameNormalized) throws Exception {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO labels(id, user_id, name, name_normalized) VALUES (?, ?, ?, ?)")) {
      ps.setObject(1, id);
      ps.setObject(2, userId);
      ps.setString(3, name);
      ps.setString(4, nameNormalized);
      ps.executeUpdate();
    }
  }

  private static void insertProject(
      Connection conn,
      UUID id,
      UUID userId,
      String name,
      String status,
      String priority,
      String health,
      LocalDate start,
      LocalDate deadline)
      throws Exception {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO projects(id, user_id, name, status, priority, health,"
                + " start_date, deadline_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")) {
      ps.setObject(1, id);
      ps.setObject(2, userId);
      ps.setString(3, name);
      ps.setString(4, status);
      ps.setString(5, priority);
      ps.setString(6, health);
      if (start != null) {
        ps.setDate(7, Date.valueOf(start));
      } else {
        ps.setNull(7, Types.DATE);
      }
      if (deadline != null) {
        ps.setDate(8, Date.valueOf(deadline));
      } else {
        ps.setNull(8, Types.DATE);
      }
      ps.executeUpdate();
    }
  }

  private static void insertMilestone(
      Connection conn, UUID id, UUID projectId, String title, String status) throws Exception {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO milestones(id, project_id, title, status) VALUES (?, ?, ?, ?)")) {
      ps.setObject(1, id);
      ps.setObject(2, projectId);
      ps.setString(3, title);
      ps.setString(4, status);
      ps.executeUpdate();
    }
  }

  private static void insertProjectLabelLink(Connection conn, UUID projectId, UUID labelId)
      throws Exception {
    try (PreparedStatement ps =
        conn.prepareStatement("INSERT INTO project_labels(project_id, label_id) VALUES (?, ?)")) {
      ps.setObject(1, projectId);
      ps.setObject(2, labelId);
      ps.executeUpdate();
    }
  }
}
