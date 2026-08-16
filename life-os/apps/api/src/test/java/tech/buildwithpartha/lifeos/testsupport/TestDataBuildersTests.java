package tech.buildwithpartha.lifeos.testsupport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class TestDataBuildersTests {

  @Test
  void createsLinkedDeterministicNeutralFixtures() {
    TestDataBuilders.UserFixture firstUser = TestDataBuilders.user();
    TestDataBuilders.UserFixture secondUser = TestDataBuilders.user();
    TestDataBuilders.ProjectFixture project = TestDataBuilders.project();
    TestDataBuilders.TaskFixture task = TestDataBuilders.task();

    assertThat(firstUser).isEqualTo(secondUser);
    assertThat(firstUser.id()).isEqualTo(TestDataBuilders.USER_ID);
    assertThat(firstUser.email()).isEqualTo("account@example.test");
    assertThat(firstUser.displayName()).isEqualTo("Test account");
    assertThat(firstUser.timeZone()).isEqualTo(ZoneId.of("Asia/Kolkata"));
    assertThat(project.userId()).isEqualTo(firstUser.id());
    assertThat(project.title()).isEqualTo("Portfolio refresh");
    assertThat(project.status()).isEqualTo(TestDataBuilders.ProjectStatus.ACTIVE);
    assertThat(task.userId()).isEqualTo(firstUser.id());
    assertThat(task.projectId()).isEqualTo(project.id());
    assertThat(task.title()).isEqualTo("Prepare weekly review");
    assertThat(task.status()).isEqualTo(TestDataBuilders.TaskStatus.TO_DO);
  }

  @Test
  void supportsIsolatedOverridesWithoutChangingDefaults() {
    UUID alternateUser = UUID.fromString("00000000-0000-4000-8000-000000000011");
    TestDataBuilders.ProjectFixture project =
        TestDataBuilders.projectBuilder()
            .ownedBy(alternateUser)
            .titled("Learning plan")
            .withStatus(TestDataBuilders.ProjectStatus.ON_HOLD)
            .build();
    TestDataBuilders.TaskFixture task =
        TestDataBuilders.taskBuilder().forProject(null).titled("Compare hosting options").build();

    assertThat(project.userId()).isEqualTo(alternateUser);
    assertThat(project.title()).isEqualTo("Learning plan");
    assertThat(project.status()).isEqualTo(TestDataBuilders.ProjectStatus.ON_HOLD);
    assertThat(task.projectId()).isNull();
    assertThat(task.title()).isEqualTo("Compare hosting options");
    assertThat(TestDataBuilders.project().title()).isEqualTo("Portfolio refresh");
    assertThat(TestDataBuilders.task().projectId()).isEqualTo(TestDataBuilders.PROJECT_ID);
  }

  @Test
  void derivesLocalDatesFromExplicitIanaTimeZones() {
    Instant boundary = Instant.parse("2026-01-01T00:30:00Z");

    assertThat(
            TestDataBuilders.timeBuilder()
                .at(boundary)
                .inTimeZone(ZoneId.of("Asia/Kolkata"))
                .build()
                .localDate())
        .isEqualTo(LocalDate.of(2026, 1, 1));
    assertThat(
            TestDataBuilders.timeBuilder()
                .at(boundary)
                .inTimeZone(ZoneId.of("America/Los_Angeles"))
                .build()
                .localDate())
        .isEqualTo(LocalDate.of(2025, 12, 31));
  }

  @Test
  void rejectsMissingRequiredOverrides() {
    assertThatNullPointerException()
        .isThrownBy(() -> TestDataBuilders.userBuilder().inTimeZone(null))
        .withMessage("value must not be null");
    assertThatNullPointerException()
        .isThrownBy(() -> TestDataBuilders.taskBuilder().dueAt(null))
        .withMessage("value must not be null");
  }
}
