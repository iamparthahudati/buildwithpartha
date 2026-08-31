package tech.buildwithpartha.lifeos.notification.infrastructure;

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

class NotificationSchemaIT {
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
  void createsNotificationTables() throws Exception {
    try (Connection conn = connection();
        PreparedStatement query =
            conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND"
                    + " table_name IN ('notifications', 'notification_preferences')")) {
      try (ResultSet result = query.executeQuery()) {
        assertThat(result.next()).isTrue();
        assertThat(result.getInt(1)).isEqualTo(2);
      }
    }
  }

  @Test
  void enforcesNotificationCheckConstraints() throws Exception {
    UUID userId = insertUser();

    assertThatThrownBy(
            () ->
                insertNotification(UUID.randomUUID(), userId, "INVALID_CATEGORY", "Title", "Body"))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("ck_notifications_category");

    assertThatThrownBy(
            () -> insertNotification(UUID.randomUUID(), userId, "DUE_REMINDER", "  ", "Body"))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("ck_notifications_title_not_blank");
  }

  @Test
  void enforcesUniqueNotificationPreferencesUser() throws Exception {
    UUID userId = insertUser();
    insertNotificationPreferences(UUID.randomUUID(), userId);

    assertThatThrownBy(() -> insertNotificationPreferences(UUID.randomUUID(), userId))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("uq_notification_preferences_user");
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

  private void insertNotification(UUID id, UUID userId, String category, String title, String body)
      throws SQLException {
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "INSERT INTO public.notifications (id, user_id, category, title, body,"
                    + " is_clearable, created_at, version) VALUES (?, ?, ?, ?, ?, TRUE, NOW(),"
                    + " 0)")) {
      statement.setObject(1, id);
      statement.setObject(2, userId);
      statement.setString(3, category);
      statement.setString(4, title);
      statement.setString(5, body);
      statement.executeUpdate();
    }
  }

  private void insertNotificationPreferences(UUID id, UUID userId) throws SQLException {
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "INSERT INTO public.notification_preferences (id, user_id, quiet_hours_enabled,"
                    + " quiet_hours_start, quiet_hours_end, created_at, updated_at, version) VALUES"
                    + " (?, ?, FALSE, '22:00', '07:00', NOW(), NOW(), 0)")) {
      statement.setObject(1, id);
      statement.setObject(2, userId);
      statement.executeUpdate();
    }
  }
}
