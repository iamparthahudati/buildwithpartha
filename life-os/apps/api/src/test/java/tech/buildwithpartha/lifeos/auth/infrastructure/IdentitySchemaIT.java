package tech.buildwithpartha.lifeos.auth.infrastructure;

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

class IdentitySchemaIT {

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
  void allIdentityTablesExistAfterMigration() throws Exception {
    String[] tables = {
      "users",
      "credentials",
      "user_sessions",
      "email_verification_tokens",
      "password_reset_tokens",
      "terms_acceptances"
    };

    try (Connection conn = connection()) {
      for (String table : tables) {
        try (PreparedStatement ps =
            conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.tables"
                    + " WHERE table_schema = 'public' AND table_name = ?")) {
          ps.setString(1, table);
          try (ResultSet rs = ps.executeQuery()) {
            assertThat(rs.next()).isTrue();
            assertThat(rs.getInt(1)).as("table '%s' must exist after V2 migration", table).isOne();
          }
        }
      }
    }
  }

  @Test
  void rejectsDuplicateEmailNormalized() throws Exception {
    String tag = UUID.randomUUID().toString();
    String sharedNormalized = "dup-" + tag + "@example.test";

    try (Connection conn = connection()) {
      insertUser(conn, UUID.randomUUID(), "a-" + tag + "@example.test", sharedNormalized, "User A");

      assertThatThrownBy(
              () ->
                  insertUser(
                      conn,
                      UUID.randomUUID(),
                      "b-" + tag + "@example.test",
                      sharedNormalized,
                      "User B"))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("uq_users_email_normalized");
    }
  }

  @Test
  void rejectsDuplicateTokenHash() throws Exception {
    UUID userId = UUID.randomUUID();
    String email = userId + "@example.test";
    String sharedHash = "sha256:collision-" + UUID.randomUUID();
    Instant future = Instant.now().plus(1, ChronoUnit.HOURS);

    try (Connection conn = connection()) {
      insertUser(conn, userId, email, email, "Hash Collision User");
      insertVerificationToken(conn, UUID.randomUUID(), userId, sharedHash, future);

      assertThatThrownBy(
              () -> insertVerificationToken(conn, UUID.randomUUID(), userId, sharedHash, future))
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("uq_email_verification_tokens_hash");
    }
  }

  @Test
  void cleanupQueryReturnsOnlyExpiredUnconsumedToken() throws Exception {
    UUID userId = UUID.randomUUID();
    String email = userId + "@example.test";
    UUID expiredId = UUID.randomUUID();
    UUID liveId = UUID.randomUUID();
    Instant twoHoursAgo = Instant.now().minus(2, ChronoUnit.HOURS);
    Instant twoHoursFromNow = Instant.now().plus(2, ChronoUnit.HOURS);

    try (Connection conn = connection()) {
      insertUser(conn, userId, email, email, "Cleanup User");
      insertVerificationToken(conn, expiredId, userId, "hash-exp-" + expiredId, twoHoursAgo);
      insertVerificationToken(conn, liveId, userId, "hash-live-" + liveId, twoHoursFromNow);

      try (PreparedStatement ps =
          conn.prepareStatement(
              "SELECT id FROM email_verification_tokens"
                  + " WHERE user_id = ? AND expires_at < NOW() AND consumed_at IS NULL")) {
        ps.setObject(1, userId);
        try (ResultSet rs = ps.executeQuery()) {
          assertThat(rs.next()).as("exactly one expired row expected").isTrue();
          assertThat(rs.getObject("id", UUID.class))
              .as("expired token id must match")
              .isEqualTo(expiredId);
          assertThat(rs.next()).as("no further rows expected").isFalse();
        }
      }
    }
  }

  @Test
  void sessionCleanupQueryReturnsOnlyExpiredUnrevokedSession() throws Exception {
    UUID userId = UUID.randomUUID();
    String email = userId + "@example.test";
    UUID expiredId = UUID.randomUUID();
    UUID liveId = UUID.randomUUID();
    UUID revokedId = UUID.randomUUID();
    Instant twoHoursAgo = Instant.now().minus(2, ChronoUnit.HOURS);
    Instant twoHoursFromNow = Instant.now().plus(2, ChronoUnit.HOURS);

    try (Connection conn = connection()) {
      insertUser(conn, userId, email, email, "Session Cleanup User");
      insertSession(conn, expiredId, userId, "hash-exp-" + expiredId, twoHoursAgo, null);
      insertSession(conn, liveId, userId, "hash-live-" + liveId, twoHoursFromNow, null);
      insertSession(conn, revokedId, userId, "hash-rev-" + revokedId, twoHoursAgo, Instant.now());

      try (PreparedStatement ps =
          conn.prepareStatement(
              "SELECT id FROM user_sessions"
                  + " WHERE user_id = ? AND expires_at < NOW() AND revoked_at IS NULL")) {
        ps.setObject(1, userId);
        try (ResultSet rs = ps.executeQuery()) {
          assertThat(rs.next()).as("exactly one expired session expected").isTrue();
          assertThat(rs.getObject("id", UUID.class))
              .as("expired session id must match")
              .isEqualTo(expiredId);
          assertThat(rs.next()).as("no further rows expected").isFalse();
        }
      }
    }
  }

  @Test
  void passwordResetCleanupQueryReturnsOnlyExpiredUnconsumedToken() throws Exception {
    UUID userId = UUID.randomUUID();
    String email = userId + "@example.test";
    UUID expiredId = UUID.randomUUID();
    UUID liveId = UUID.randomUUID();
    Instant twoHoursAgo = Instant.now().minus(2, ChronoUnit.HOURS);
    Instant twoHoursFromNow = Instant.now().plus(2, ChronoUnit.HOURS);

    try (Connection conn = connection()) {
      insertUser(conn, userId, email, email, "Reset Cleanup User");
      insertPasswordResetToken(conn, expiredId, userId, "hash-exp-" + expiredId, twoHoursAgo);
      insertPasswordResetToken(conn, liveId, userId, "hash-live-" + liveId, twoHoursFromNow);

      try (PreparedStatement ps =
          conn.prepareStatement(
              "SELECT id FROM password_reset_tokens"
                  + " WHERE user_id = ? AND expires_at < NOW() AND consumed_at IS NULL")) {
        ps.setObject(1, userId);
        try (ResultSet rs = ps.executeQuery()) {
          assertThat(rs.next()).as("exactly one expired reset token expected").isTrue();
          assertThat(rs.getObject("id", UUID.class))
              .as("expired reset token id must match")
              .isEqualTo(expiredId);
          assertThat(rs.next()).as("no further rows expected").isFalse();
        }
      }
    }
  }

  private static Connection connection() throws Exception {
    return DriverManager.getConnection(jdbcUrl, username, password);
  }

  private static void insertUser(
      Connection conn, UUID id, String email, String emailNormalized, String displayName)
      throws Exception {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO users(id, email, email_normalized, display_name, time_zone, locale)"
                + " VALUES (?, ?, ?, ?, 'UTC', 'en')")) {
      ps.setObject(1, id);
      ps.setString(2, email);
      ps.setString(3, emailNormalized);
      ps.setString(4, displayName);
      ps.executeUpdate();
    }
  }

  private static void insertVerificationToken(
      Connection conn, UUID id, UUID userId, String tokenHash, Instant expiresAt) throws Exception {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO email_verification_tokens(id, user_id, token_hash, expires_at)"
                + " VALUES (?, ?, ?, ?)")) {
      ps.setObject(1, id);
      ps.setObject(2, userId);
      ps.setString(3, tokenHash);
      ps.setTimestamp(4, Timestamp.from(expiresAt));
      ps.executeUpdate();
    }
  }

  private static void insertSession(
      Connection conn, UUID id, UUID userId, String tokenHash, Instant expiresAt, Instant revokedAt)
      throws Exception {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO user_sessions(id, user_id, token_hash, csrf_secret, expires_at,"
                + " revoked_at) VALUES (?, ?, ?, 'csrf-secret', ?, ?)")) {
      ps.setObject(1, id);
      ps.setObject(2, userId);
      ps.setString(3, tokenHash);
      ps.setTimestamp(4, Timestamp.from(expiresAt));
      ps.setTimestamp(5, revokedAt == null ? null : Timestamp.from(revokedAt));
      ps.executeUpdate();
    }
  }

  private static void insertPasswordResetToken(
      Connection conn, UUID id, UUID userId, String tokenHash, Instant expiresAt) throws Exception {
    try (PreparedStatement ps =
        conn.prepareStatement(
            "INSERT INTO password_reset_tokens(id, user_id, token_hash, expires_at)"
                + " VALUES (?, ?, ?, ?)")) {
      ps.setObject(1, id);
      ps.setObject(2, userId);
      ps.setString(3, tokenHash);
      ps.setTimestamp(4, Timestamp.from(expiresAt));
      ps.executeUpdate();
    }
  }
}
