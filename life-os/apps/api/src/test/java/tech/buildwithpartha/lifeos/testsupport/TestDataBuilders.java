package tech.buildwithpartha.lifeos.testsupport;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

/** Deterministic, privacy-safe fixtures shared by backend tests. */
public final class TestDataBuilders {

  public static final UUID USER_ID = UUID.fromString("00000000-0000-4000-8000-000000000001");
  public static final UUID PROJECT_ID = UUID.fromString("00000000-0000-4000-8000-000000000002");
  public static final UUID TASK_ID = UUID.fromString("00000000-0000-4000-8000-000000000003");
  public static final Instant TEST_INSTANT = Instant.parse("2026-08-16T08:30:00Z");
  public static final ZoneId TEST_TIME_ZONE = ZoneId.of("Asia/Kolkata");

  private TestDataBuilders() {}

  public static UserFixture user() {
    return userBuilder().build();
  }

  public static UserBuilder userBuilder() {
    return new UserBuilder();
  }

  public static ProjectFixture project() {
    return projectBuilder().build();
  }

  public static ProjectBuilder projectBuilder() {
    return new ProjectBuilder();
  }

  public static TaskFixture task() {
    return taskBuilder().build();
  }

  public static TaskBuilder taskBuilder() {
    return new TaskBuilder();
  }

  public static TimeFixture time() {
    return timeBuilder().build();
  }

  public static TimeBuilder timeBuilder() {
    return new TimeBuilder();
  }

  public record UserFixture(
      UUID id, String email, String displayName, Locale locale, ZoneId timeZone) {

    public UserFixture {
      Objects.requireNonNull(id, "id must not be null");
      Objects.requireNonNull(email, "email must not be null");
      Objects.requireNonNull(displayName, "displayName must not be null");
      Objects.requireNonNull(locale, "locale must not be null");
      Objects.requireNonNull(timeZone, "timeZone must not be null");
    }
  }

  public enum ProjectStatus {
    PLANNED,
    ACTIVE,
    ON_HOLD,
    COMPLETED,
    CANCELLED
  }

  public enum TaskStatus {
    TO_DO,
    IN_PROGRESS,
    BLOCKED,
    DONE,
    CANCELLED
  }

  public record ProjectFixture(UUID id, UUID userId, String title, ProjectStatus status) {

    public ProjectFixture {
      Objects.requireNonNull(id, "id must not be null");
      Objects.requireNonNull(userId, "userId must not be null");
      Objects.requireNonNull(title, "title must not be null");
      Objects.requireNonNull(status, "status must not be null");
    }
  }

  public record TaskFixture(
      UUID id, UUID userId, UUID projectId, String title, TaskStatus status, Instant dueAt) {

    public TaskFixture {
      Objects.requireNonNull(id, "id must not be null");
      Objects.requireNonNull(userId, "userId must not be null");
      Objects.requireNonNull(title, "title must not be null");
      Objects.requireNonNull(status, "status must not be null");
      Objects.requireNonNull(dueAt, "dueAt must not be null");
    }
  }

  public record TimeFixture(Instant instant, ZoneId timeZone, LocalDate localDate) {

    public TimeFixture {
      Objects.requireNonNull(instant, "instant must not be null");
      Objects.requireNonNull(timeZone, "timeZone must not be null");
      Objects.requireNonNull(localDate, "localDate must not be null");
    }
  }

  public static final class UserBuilder {

    private UUID id = USER_ID;
    private String email = "account@example.test";
    private String displayName = "Test account";
    private Locale locale = Locale.forLanguageTag("en-IN");
    private ZoneId timeZone = TEST_TIME_ZONE;

    private UserBuilder() {}

    public UserBuilder withId(UUID value) {
      id = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public UserBuilder withEmail(String value) {
      email = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public UserBuilder withDisplayName(String value) {
      displayName = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public UserBuilder withLocale(Locale value) {
      locale = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public UserBuilder inTimeZone(ZoneId value) {
      timeZone = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public UserFixture build() {
      return new UserFixture(id, email, displayName, locale, timeZone);
    }
  }

  public static final class ProjectBuilder {

    private UUID id = PROJECT_ID;
    private UUID userId = USER_ID;
    private String title = "Portfolio refresh";
    private ProjectStatus status = ProjectStatus.ACTIVE;

    private ProjectBuilder() {}

    public ProjectBuilder withId(UUID value) {
      id = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public ProjectBuilder ownedBy(UUID value) {
      userId = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public ProjectBuilder titled(String value) {
      title = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public ProjectBuilder withStatus(ProjectStatus value) {
      status = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public ProjectFixture build() {
      return new ProjectFixture(id, userId, title, status);
    }
  }

  public static final class TaskBuilder {

    private UUID id = TASK_ID;
    private UUID userId = USER_ID;
    private UUID projectId = PROJECT_ID;
    private String title = "Prepare weekly review";
    private TaskStatus status = TaskStatus.TO_DO;
    private Instant dueAt = TEST_INSTANT;

    private TaskBuilder() {}

    public TaskBuilder withId(UUID value) {
      id = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public TaskBuilder ownedBy(UUID value) {
      userId = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public TaskBuilder forProject(UUID value) {
      projectId = value;
      return this;
    }

    public TaskBuilder titled(String value) {
      title = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public TaskBuilder withStatus(TaskStatus value) {
      status = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public TaskBuilder dueAt(Instant value) {
      dueAt = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public TaskFixture build() {
      return new TaskFixture(id, userId, projectId, title, status, dueAt);
    }
  }

  public static final class TimeBuilder {

    private Instant instant = TEST_INSTANT;
    private ZoneId timeZone = TEST_TIME_ZONE;

    private TimeBuilder() {}

    public TimeBuilder at(Instant value) {
      instant = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public TimeBuilder inTimeZone(ZoneId value) {
      timeZone = Objects.requireNonNull(value, "value must not be null");
      return this;
    }

    public TimeFixture build() {
      return new TimeFixture(instant, timeZone, instant.atZone(timeZone).toLocalDate());
    }
  }
}
