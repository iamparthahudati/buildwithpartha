package tech.buildwithpartha.lifeos.focus.infrastructure;

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

class FocusSessionSchemaIT {

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
      jdbcUrl =
          System.getenv()
              .getOrDefault("LIFEOS_TEST_DB_URL", "jdbc:postgresql://127.0.0.1:5432/lifeos_test");
      username = System.getenv().getOrDefault("LIFEOS_TEST_DB_USER", localUser);
      password = System.getenv().getOrDefault("LIFEOS_TEST_DB_PASSWORD", "");
    }

    try (Connection ignored = connection()) {
      // Connection is available.
    } catch (Exception exception) {
      Assumptions.assumeTrue(false, "PostgreSQL is required: " + exception.getMessage());
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
  void migrationCreatesFocusTablesAndSingleActiveIndex() throws Exception {
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'"
                    + " AND indexname = 'uq_focus_sessions_one_active_per_user'")) {
      try (ResultSet result = statement.executeQuery()) {
        assertThat(result.next()).isTrue();
        assertThat(result.getInt(1)).isOne();
      }
    }
    assertThat(tableExists("focus_sessions")).isTrue();
    assertThat(tableExists("focus_session_interruptions")).isTrue();
    assertThat(tableExists("focus_session_operations")).isTrue();
  }

  @Test
  void allowsOnlyOneRunningOrPausedSessionPerUser() throws Exception {
    UUID userId = insertUser("focus-active");
    insertSession(UUID.randomUUID(), userId, null, null, "RUNNING", "FOCUS");

    assertThatThrownBy(
            () -> insertSession(UUID.randomUUID(), userId, null, null, "PAUSED", "FOCUS"))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("uq_focus_sessions_one_active_per_user");

    insertSession(UUID.randomUUID(), userId, null, null, "COMPLETED", "FOCUS");
  }

  @Test
  void rejectsInvalidStateShapesStatusesPhasesAndDurations() throws Exception {
    UUID userId = insertUser("focus-constraints");

    assertThatThrownBy(
            () -> insertSession(UUID.randomUUID(), userId, null, null, "UNKNOWN", "FOCUS"))
        .isInstanceOf(SQLException.class);
    assertThatThrownBy(
            () -> insertSession(UUID.randomUUID(), userId, null, null, "RUNNING", "UNKNOWN"))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("ck_focus_sessions_phase");

    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "INSERT INTO public.focus_sessions"
                    + " (id, user_id, status, phase, planned_focus_duration_seconds,"
                    + " planned_break_duration_seconds, actual_focus_duration_seconds,"
                    + " actual_break_duration_seconds, started_at, phase_started_at, paused_at,"
                    + " created_at, updated_at, version) VALUES (?, ?, 'RUNNING', 'FOCUS', 0, 0,"
                    + " 0, 0, ?, ?, NULL, ?, ?, 0)")) {
      UUID id = UUID.randomUUID();
      statement.setObject(1, id);
      statement.setObject(2, userId);
      statement.setTimestamp(3, Timestamp.from(Instant.parse("2026-08-24T09:00:00Z")));
      statement.setTimestamp(4, Timestamp.from(Instant.parse("2026-08-24T09:00:00Z")));
      statement.setTimestamp(5, Timestamp.from(Instant.parse("2026-08-24T09:00:00Z")));
      statement.setTimestamp(6, Timestamp.from(Instant.parse("2026-08-24T09:00:00Z")));
      assertThatThrownBy(statement::executeUpdate)
          .isInstanceOf(SQLException.class)
          .hasMessageContaining("ck_focus_sessions_planned_focus_positive");
    }
  }

  @Test
  void enforcesTaskAndTimeBlockOwnershipAndNullifiesDeletedContext() throws Exception {
    UUID ownerId = insertUser("focus-owner");
    UUID otherId = insertUser("focus-other");
    UUID ownerTaskId = insertTask(ownerId);
    UUID ownerTimeBlockId = insertTimeBlock(ownerId, ownerTaskId);
    UUID otherTaskId = insertTask(otherId);

    assertThatThrownBy(
            () ->
                insertSession(
                    UUID.randomUUID(), ownerId, otherTaskId, ownerTimeBlockId, "RUNNING", "FOCUS"))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("fk_focus_sessions_task_owner");

    UUID sessionId = UUID.randomUUID();
    insertSession(sessionId, ownerId, ownerTaskId, ownerTimeBlockId, "COMPLETED", "FOCUS");
    executeDelete("DELETE FROM public.tasks WHERE id = ?", ownerTaskId);
    assertThat(queryUuid("SELECT task_id FROM public.focus_sessions WHERE id = ?", sessionId))
        .isNull();
    executeDelete("DELETE FROM public.time_blocks WHERE id = ?", ownerTimeBlockId);
    assertThat(queryUuid("SELECT time_block_id FROM public.focus_sessions WHERE id = ?", sessionId))
        .isNull();
  }

  @Test
  void interruptionOwnershipIsEnforcedAndUserDeletionCascades() throws Exception {
    UUID ownerId = insertUser("focus-interruption-owner");
    UUID otherId = insertUser("focus-interruption-other");
    UUID sessionId = UUID.randomUUID();
    insertSession(sessionId, ownerId, null, null, "RUNNING", "FOCUS");

    assertThatThrownBy(() -> insertInterruption(sessionId, otherId, "Wrong owner"))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("fk_focus_session_interruptions_session_owner");
    insertInterruption(sessionId, ownerId, "Doorbell");

    executeDelete("DELETE FROM public.users WHERE id = ?", ownerId);
    assertThat(count("SELECT COUNT(*) FROM public.focus_sessions WHERE id = ?", sessionId))
        .isZero();
    assertThat(
            count(
                "SELECT COUNT(*) FROM public.focus_session_interruptions"
                    + " WHERE focus_session_id = ?",
                sessionId))
        .isZero();
  }

  @Test
  void operationKeysAreOwnerScopedUniqueAndContentFree() throws Exception {
    UUID ownerId = insertUser("focus-operation-owner");
    UUID otherId = insertUser("focus-operation-other");
    UUID sessionId = UUID.randomUUID();
    insertSession(sessionId, ownerId, null, null, "RUNNING", "FOCUS");

    insertOperation(ownerId, "focus-operation-key-001", "PAUSE", sessionId, null);
    assertThatThrownBy(
            () -> insertOperation(ownerId, "focus-operation-key-001", "RESUME", sessionId, null))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("uq_focus_session_operations_user_key");
    assertThatThrownBy(
            () -> insertOperation(otherId, "focus-operation-key-002", "PAUSE", sessionId, null))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("fk_focus_session_operations_session_owner");
    assertThatThrownBy(
            () ->
                insertOperation(
                    ownerId, "focus-operation-key-003", "RECORD_INTERRUPTION", sessionId, null))
        .isInstanceOf(SQLException.class)
        .hasMessageContaining("ck_focus_session_operations_interruption");
  }

  private static boolean tableExists(String tableName) throws SQLException {
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.tables"
                    + " WHERE table_schema = 'public' AND table_name = ?")) {
      statement.setString(1, tableName);
      try (ResultSet result = statement.executeQuery()) {
        result.next();
        return result.getInt(1) == 1;
      }
    }
  }

  private static Connection connection() throws SQLException {
    return DriverManager.getConnection(jdbcUrl, username, password);
  }

  private static UUID insertUser(String localPart) throws SQLException {
    UUID id = UUID.randomUUID();
    String email = localPart + "-" + id + "@example.test";
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "INSERT INTO public.users (id, email, email_normalized, display_name, time_zone,"
                    + " locale, week_start, account_status, version)"
                    + " VALUES (?, ?, ?, 'Test User', 'UTC', 'en-US', 1, 'ACTIVE', 0)")) {
      statement.setObject(1, id);
      statement.setString(2, email);
      statement.setString(3, email);
      statement.executeUpdate();
    }
    return id;
  }

  private static UUID insertTask(UUID userId) throws SQLException {
    UUID id = UUID.randomUUID();
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "INSERT INTO public.tasks (id, user_id, title, status, priority, estimate_minutes,"
                    + " spent_minutes, progress, position, version)"
                    + " VALUES (?, ?, 'Test Task', 'TO_DO', 'P2', 0, 0, 0, 0, 0)")) {
      statement.setObject(1, id);
      statement.setObject(2, userId);
      statement.executeUpdate();
    }
    return id;
  }

  private static UUID insertTimeBlock(UUID userId, UUID taskId) throws SQLException {
    UUID id = UUID.randomUUID();
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "INSERT INTO public.time_blocks (id, user_id, task_id, title, category, status,"
                    + " start_at, end_at, source_time_zone, version)"
                    + " VALUES (?, ?, ?, 'Test Time Block', 'FOCUS', 'SCHEDULED', ?, ?,"
                    + " 'UTC', 0)")) {
      statement.setObject(1, id);
      statement.setObject(2, userId);
      statement.setObject(3, taskId);
      statement.setTimestamp(4, Timestamp.from(Instant.parse("2026-08-24T09:00:00Z")));
      statement.setTimestamp(5, Timestamp.from(Instant.parse("2026-08-24T10:00:00Z")));
      statement.executeUpdate();
    }
    return id;
  }

  private static void insertSession(
      UUID id, UUID userId, UUID taskId, UUID timeBlockId, String status, String phase)
      throws SQLException {
    Instant start = Instant.parse("2026-08-24T09:00:00Z");
    boolean running = "RUNNING".equals(status);
    boolean paused = "PAUSED".equals(status);
    boolean terminal = "COMPLETED".equals(status) || "CANCELLED".equals(status);
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "INSERT INTO public.focus_sessions"
                    + " (id, user_id, task_id, time_block_id, status, phase,"
                    + " planned_focus_duration_seconds, planned_break_duration_seconds,"
                    + " actual_focus_duration_seconds, actual_break_duration_seconds, started_at,"
                    + " phase_started_at, paused_at, ended_at, created_at, updated_at, version)"
                    + " VALUES (?, ?, ?, ?, ?, ?, 1500, 300, 0, 0, ?, ?, ?, ?, ?, ?, 0)")) {
      statement.setObject(1, id);
      statement.setObject(2, userId);
      setNullableUuid(statement, 3, taskId);
      setNullableUuid(statement, 4, timeBlockId);
      statement.setString(5, status);
      statement.setString(6, phase);
      statement.setTimestamp(7, Timestamp.from(start));
      setNullableInstant(statement, 8, running ? start : null);
      setNullableInstant(statement, 9, paused ? start.plusSeconds(1) : null);
      setNullableInstant(statement, 10, terminal ? start.plusSeconds(1) : null);
      statement.setTimestamp(11, Timestamp.from(start));
      statement.setTimestamp(12, Timestamp.from(start.plusSeconds(1)));
      statement.executeUpdate();
    }
  }

  private static void insertInterruption(UUID sessionId, UUID userId, String note)
      throws SQLException {
    Instant occurred = Instant.parse("2026-08-24T09:00:05Z");
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "INSERT INTO public.focus_session_interruptions"
                    + " (id, focus_session_id, user_id, occurred_at, note, created_at, version)"
                    + " VALUES (?, ?, ?, ?, ?, ?, 0)")) {
      statement.setObject(1, UUID.randomUUID());
      statement.setObject(2, sessionId);
      statement.setObject(3, userId);
      statement.setTimestamp(4, Timestamp.from(occurred));
      statement.setString(5, note);
      statement.setTimestamp(6, Timestamp.from(occurred));
      statement.executeUpdate();
    }
  }

  private static void insertOperation(
      UUID userId, String key, String type, UUID sessionId, UUID interruptionId)
      throws SQLException {
    try (Connection conn = connection();
        PreparedStatement statement =
            conn.prepareStatement(
                "INSERT INTO public.focus_session_operations"
                    + " (id, user_id, idempotency_key, operation_type, focus_session_id,"
                    + " interruption_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")) {
      statement.setObject(1, UUID.randomUUID());
      statement.setObject(2, userId);
      statement.setString(3, key);
      statement.setString(4, type);
      statement.setObject(5, sessionId);
      setNullableUuid(statement, 6, interruptionId);
      statement.setTimestamp(7, Timestamp.from(Instant.parse("2026-08-24T09:00:10Z")));
      statement.executeUpdate();
    }
  }

  private static void executeDelete(String sql, UUID id) throws SQLException {
    try (Connection conn = connection();
        PreparedStatement statement = conn.prepareStatement(sql)) {
      statement.setObject(1, id);
      statement.executeUpdate();
    }
  }

  private static UUID queryUuid(String sql, UUID id) throws SQLException {
    try (Connection conn = connection();
        PreparedStatement statement = conn.prepareStatement(sql)) {
      statement.setObject(1, id);
      try (ResultSet result = statement.executeQuery()) {
        assertThat(result.next()).isTrue();
        return result.getObject(1, UUID.class);
      }
    }
  }

  private static int count(String sql, UUID id) throws SQLException {
    try (Connection conn = connection();
        PreparedStatement statement = conn.prepareStatement(sql)) {
      statement.setObject(1, id);
      try (ResultSet result = statement.executeQuery()) {
        result.next();
        return result.getInt(1);
      }
    }
  }

  private static void setNullableUuid(PreparedStatement statement, int index, UUID value)
      throws SQLException {
    if (value == null) {
      statement.setNull(index, Types.OTHER);
    } else {
      statement.setObject(index, value);
    }
  }

  private static void setNullableInstant(PreparedStatement statement, int index, Instant value)
      throws SQLException {
    if (value == null) {
      statement.setNull(index, Types.TIMESTAMP_WITH_TIMEZONE);
    } else {
      statement.setTimestamp(index, Timestamp.from(value));
    }
  }
}
