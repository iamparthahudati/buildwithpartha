package tech.buildwithpartha.lifeos.notification.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tech.buildwithpartha.lifeos.testsupport.PostgreSqlTestContainerFactory;

/**
 * Mirrors {@code auth.infrastructure.IdentitySchemaIT}'s Testcontainers-or-local-Postgres pattern.
 */
class OutboxSchemaIT {

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
  void outboxTableExistsAfterMigration() throws Exception {
    try (Connection conn = connection();
        PreparedStatement ps =
            conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.tables"
                    + " WHERE table_schema = 'public' AND table_name = 'outbox_messages'")) {
      try (ResultSet rs = ps.executeQuery()) {
        assertThat(rs.next()).isTrue();
        assertThat(rs.getInt(1)).as("outbox_messages must exist after V3 migration").isOne();
      }
    }
  }

  @Test
  void rejectsInvalidMessageKind() throws Exception {
    try (Connection conn = connection()) {
      assertThatThrownBy(
              () ->
                  insertOutboxMessage(
                      conn,
                      UUID.randomUUID(),
                      null,
                      "NOT_A_REAL_KIND",
                      "PENDING",
                      "a@example.test",
                      Instant.now()))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_outbox_messages_kind");
    }
  }

  @Test
  void rejectsInvalidStatus() throws Exception {
    try (Connection conn = connection()) {
      assertThatThrownBy(
              () ->
                  insertOutboxMessage(
                      conn,
                      UUID.randomUUID(),
                      null,
                      "EMAIL_VERIFICATION",
                      "NOT_A_REAL_STATUS",
                      "a@example.test",
                      Instant.now()))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_outbox_messages_status");
    }
  }

  @Test
  void cascadeDeletesOutboxRowsWhenUserIsDeleted() throws Exception {
    UUID userId = UUID.randomUUID();
    String email = userId + "@example.test";
    UUID messageId = UUID.randomUUID();

    try (Connection conn = connection()) {
      insertUser(conn, userId, email);
      insertOutboxMessage(
          conn, messageId, userId, "EMAIL_VERIFICATION", "PENDING", email, Instant.now());

      try (PreparedStatement delete = conn.prepareStatement("DELETE FROM users WHERE id = ?")) {
        delete.setObject(1, userId);
        delete.executeUpdate();
      }

      try (PreparedStatement ps =
          conn.prepareStatement("SELECT COUNT(*) FROM outbox_messages WHERE id = ?")) {
        ps.setObject(1, messageId);
        try (ResultSet rs = ps.executeQuery()) {
          assertThat(rs.next()).isTrue();
          assertThat(rs.getInt(1)).as("outbox row must be cascade-deleted with its user").isZero();
        }
      }
    }
  }

  @Test
  void pendingIndexQueryReturnsOnlyDuePendingMessages() throws Exception {
    String tag = UUID.randomUUID().toString();
    UUID dueId = UUID.randomUUID();
    UUID notYetDueId = UUID.randomUUID();
    UUID sentId = UUID.randomUUID();
    Instant twoMinutesAgo = Instant.now().minus(2, ChronoUnit.MINUTES);
    Instant twoMinutesFromNow = Instant.now().plus(2, ChronoUnit.MINUTES);

    try (Connection conn = connection()) {
      insertOutboxMessage(
          conn,
          dueId,
          null,
          "EMAIL_VERIFICATION",
          "PENDING",
          "due-" + tag + "@example.test",
          twoMinutesAgo);
      insertOutboxMessage(
          conn,
          notYetDueId,
          null,
          "EMAIL_VERIFICATION",
          "PENDING",
          "future-" + tag + "@example.test",
          twoMinutesFromNow);
      insertOutboxMessage(
          conn,
          sentId,
          null,
          "EMAIL_VERIFICATION",
          "SENT",
          "sent-" + tag + "@example.test",
          twoMinutesAgo);

      try (PreparedStatement ps =
          conn.prepareStatement(
              "SELECT id FROM outbox_messages"
                  + " WHERE status = 'PENDING' AND next_attempt_at <= NOW()"
                  + " AND recipient_email LIKE ?")) {
        ps.setString(1, "%" + tag + "%");
        try (ResultSet rs = ps.executeQuery()) {
          assertThat(rs.next()).as("exactly one due pending row expected").isTrue();
          assertThat(rs.getObject("id", UUID.class)).as("due row id must match").isEqualTo(dueId);
          assertThat(rs.next()).as("no further rows expected").isFalse();
        }
      }
    }
  }

  @Test
  void cleanupIndexQueryReturnsOnlyQualifyingTerminalRows() throws Exception {
    String tag = UUID.randomUUID().toString();
    UUID oldSentId = UUID.randomUUID();
    UUID recentSentId = UUID.randomUUID();
    UUID oldPendingId = UUID.randomUUID();
    Instant eightDaysAgo = Instant.now().minus(8, ChronoUnit.DAYS);
    Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);

    try (Connection conn = connection()) {
      insertOutboxMessage(
          conn,
          oldSentId,
          null,
          "EMAIL_VERIFICATION",
          "SENT",
          "old-sent-" + tag + "@example.test",
          eightDaysAgo);
      updateUpdatedAt(conn, oldSentId, eightDaysAgo);

      insertOutboxMessage(
          conn,
          recentSentId,
          null,
          "EMAIL_VERIFICATION",
          "SENT",
          "recent-sent-" + tag + "@example.test",
          oneHourAgo);
      updateUpdatedAt(conn, recentSentId, oneHourAgo);

      insertOutboxMessage(
          conn,
          oldPendingId,
          null,
          "EMAIL_VERIFICATION",
          "PENDING",
          "old-pending-" + tag + "@example.test",
          eightDaysAgo);
      updateUpdatedAt(conn, oldPendingId, eightDaysAgo);

      try (PreparedStatement ps =
          conn.prepareStatement(
              "SELECT id FROM outbox_messages"
                  + " WHERE status IN ('SENT','DEAD_LETTERED')"
                  + " AND updated_at < NOW() - INTERVAL '7 days'"
                  + " AND recipient_email LIKE ?")) {
        ps.setString(1, "%" + tag + "%");
        try (ResultSet rs = ps.executeQuery()) {
          assertThat(rs.next()).as("exactly one qualifying terminal row expected").isTrue();
          assertThat(rs.getObject("id", UUID.class))
              .as("qualifying row id must match")
              .isEqualTo(oldSentId);
          assertThat(rs.next()).as("no further rows expected").isFalse();
        }
      }
    }
  }

  private static Connection connection() throws Exception {
    return DriverManager.getConnection(jdbcUrl, username, password);
  }

  private static void insertUser(Connection conn, UUID id, String email) throws Exception {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO users(id, email, email_normalized, display_name, time_zone, locale)"
                + " VALUES (?, ?, ?, ?, 'UTC', 'en')")) {
      ps.setObject(1, id);
      ps.setString(2, email);
      ps.setString(3, email);
      ps.setString(4, "Outbox Test User");
      ps.executeUpdate();
    }
  }

  private static void insertOutboxMessage(
      Connection conn,
      UUID id,
      UUID userId,
      String messageKind,
      String status,
      String recipientEmail,
      Instant nextAttemptAt)
      throws Exception {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO outbox_messages(id, user_id, message_kind, status, recipient_email,"
                + " next_attempt_at) VALUES (?, ?, ?, ?, ?, ?)")) {
      ps.setObject(1, id);
      ps.setObject(2, userId);
      ps.setString(3, messageKind);
      ps.setString(4, status);
      ps.setString(5, recipientEmail);
      ps.setTimestamp(6, Timestamp.from(nextAttemptAt));
      ps.executeUpdate();
    }
  }

  private static void updateUpdatedAt(Connection conn, UUID id, Instant updatedAt)
      throws Exception {
    try (PreparedStatement ps =
        conn.prepareStatement("UPDATE outbox_messages SET updated_at = ? WHERE id = ?")) {
      ps.setTimestamp(1, Timestamp.from(updatedAt));
      ps.setObject(2, id);
      ps.executeUpdate();
    }
  }
}
