package tech.buildwithpartha.lifeos.comment.infrastructure;

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

/** PostgreSQL/Flyway verification for LOS-0821 ownership, shape, and deletion constraints. */
class CommentSchemaIT {

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
      // Fall through to the documented local PostgreSQL test connection.
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
          System.getenv().getOrDefault("LIFEOS_TEST_DB_USER", System.getProperty("user.name"));
      password = System.getenv().getOrDefault("LIFEOS_TEST_DB_PASSWORD", "");
    }
    try (Connection ignored = connection()) {
      // Connection is available.
    } catch (Exception exception) {
      Assumptions.assumeTrue(false, "PostgreSQL unavailable: " + exception.getMessage());
    }
    try (Connection connection = connection();
        Statement statement = connection.createStatement()) {
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
  void migrationCreatesCommentsTable() throws Exception {
    try (Connection connection = connection();
        PreparedStatement statement =
            connection.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.tables "
                    + "WHERE table_schema='public' AND table_name='comments'")) {
      try (ResultSet result = statement.executeQuery()) {
        assertThat(result.next()).isTrue();
        assertThat(result.getInt(1)).isOne();
      }
    }
  }

  @Test
  void databaseRejectsCrossUserParentAndMultipleParents() throws Exception {
    UUID owner = UUID.randomUUID();
    UUID otherUser = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();
    try (Connection connection = connection()) {
      insertUser(connection, owner);
      insertUser(connection, otherUser);
      insertTask(connection, taskId, owner);
      insertProject(connection, projectId, owner);

      assertThatThrownBy(
              () -> insertComment(connection, otherUser, taskId, null, "PLAIN_TEXT", "Cross"))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("fk_comments_task_owner");
      assertThatThrownBy(
              () ->
                  insertComment(connection, owner, taskId, projectId, "PLAIN_TEXT", "Two parents"))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_comments_one_parent");
      assertThatThrownBy(
              () -> insertComment(connection, owner, taskId, null, "HTML", "Unsafe format"))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_comments_format");
    }
  }

  @Test
  void deletingParentCascadesCommentBody() throws Exception {
    UUID owner = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    UUID commentId;
    try (Connection connection = connection()) {
      insertUser(connection, owner);
      insertTask(connection, taskId, owner);
      commentId = insertComment(connection, owner, taskId, null, "PLAIN_TEXT", "Private");
      try (PreparedStatement delete = connection.prepareStatement("DELETE FROM tasks WHERE id=?")) {
        delete.setObject(1, taskId);
        delete.executeUpdate();
      }
      try (PreparedStatement query =
          connection.prepareStatement("SELECT COUNT(*) FROM comments WHERE id=?")) {
        query.setObject(1, commentId);
        try (ResultSet result = query.executeQuery()) {
          assertThat(result.next()).isTrue();
          assertThat(result.getInt(1)).isZero();
        }
      }
    }
  }

  private static Connection connection() throws SQLException {
    return DriverManager.getConnection(jdbcUrl, username, password);
  }

  private static void insertUser(Connection connection, UUID id) throws SQLException {
    String email = id + "@example.test";
    try (PreparedStatement statement =
        connection.prepareStatement(
            "INSERT INTO users(id,email,email_normalized,display_name,time_zone,locale) "
                + "VALUES (?,?,?,'Comment Test','UTC','en')")) {
      statement.setObject(1, id);
      statement.setString(2, email);
      statement.setString(3, email);
      statement.executeUpdate();
    }
  }

  private static void insertTask(Connection connection, UUID id, UUID userId) throws SQLException {
    try (PreparedStatement statement =
        connection.prepareStatement("INSERT INTO tasks(id,user_id,title) VALUES (?,?,'Task')")) {
      statement.setObject(1, id);
      statement.setObject(2, userId);
      statement.executeUpdate();
    }
  }

  private static void insertProject(Connection connection, UUID id, UUID userId)
      throws SQLException {
    try (PreparedStatement statement =
        connection.prepareStatement(
            "INSERT INTO projects(id,user_id,name) VALUES (?,?,'Project')")) {
      statement.setObject(1, id);
      statement.setObject(2, userId);
      statement.executeUpdate();
    }
  }

  private static UUID insertComment(
      Connection connection, UUID userId, UUID taskId, UUID projectId, String format, String body)
      throws SQLException {
    UUID id = UUID.randomUUID();
    try (PreparedStatement statement =
        connection.prepareStatement(
            "INSERT INTO comments(id,user_id,task_id,project_id,format,body) "
                + "VALUES (?,?,?,?,?,?)")) {
      statement.setObject(1, id);
      statement.setObject(2, userId);
      statement.setObject(3, taskId);
      statement.setObject(4, projectId);
      statement.setString(5, format);
      statement.setString(6, body);
      statement.executeUpdate();
    }
    return id;
  }
}
