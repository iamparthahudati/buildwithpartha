package tech.buildwithpartha.lifeos.audit.infrastructure;

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

/** PostgreSQL/Flyway verification for LOS-0823 typed Activity object references. */
class ActivitySchemaIT {

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
  void migrationAddsRequiredTypedObjectColumns() throws Exception {
    try (Connection connection = connection();
        PreparedStatement statement =
            connection.prepareStatement(
                "SELECT column_name, is_nullable FROM information_schema.columns "
                    + "WHERE table_schema='public' AND table_name='product_activity_events' "
                    + "AND column_name IN ('object_type','object_id') ORDER BY column_name")) {
      try (ResultSet result = statement.executeQuery()) {
        assertThat(result.next()).isTrue();
        assertThat(result.getString("column_name")).isEqualTo("object_id");
        assertThat(result.getString("is_nullable")).isEqualTo("NO");
        assertThat(result.next()).isTrue();
        assertThat(result.getString("column_name")).isEqualTo("object_type");
        assertThat(result.getString("is_nullable")).isEqualTo("NO");
      }
    }
  }

  @Test
  void databaseAcceptsOnlyCanonicalObjectTypes() throws Exception {
    UUID userId = UUID.randomUUID();
    try (Connection connection = connection()) {
      insertUser(connection, userId);
      insertActivity(connection, userId, "TASK");
      assertThatThrownBy(() -> insertActivity(connection, userId, "COMMENT"))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_product_activity_object_type");
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
                + "VALUES (?,?,?,'Activity Test','UTC','en')")) {
      statement.setObject(1, id);
      statement.setString(2, email);
      statement.setString(3, email);
      statement.executeUpdate();
    }
  }

  private static void insertActivity(Connection connection, UUID userId, String objectType)
      throws SQLException {
    try (PreparedStatement statement =
        connection.prepareStatement(
            "INSERT INTO product_activity_events"
                + "(user_id,actor_user_id,event_type,subject_type,subject_id,object_type,object_id,"
                + "correlation_id) VALUES (?,?,'TASK_UPDATED','TASK',?,?,?,'schema-test')")) {
      statement.setObject(1, userId);
      statement.setObject(2, userId);
      statement.setObject(3, UUID.randomUUID());
      statement.setString(4, objectType);
      statement.setObject(5, UUID.randomUUID());
      statement.executeUpdate();
    }
  }
}
