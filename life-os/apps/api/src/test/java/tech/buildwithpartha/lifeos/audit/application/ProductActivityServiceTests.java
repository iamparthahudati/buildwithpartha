package tech.buildwithpartha.lifeos.audit.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import tech.buildwithpartha.lifeos.common.activity.ActivityEventType;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityCommand;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;

class ProductActivityServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-23T10:00:00Z");

  private FakeProductActivityRepository repository;
  private ProductActivityService service;

  @BeforeEach
  void setUp() {
    repository = new FakeProductActivityRepository();
    service = new ProductActivityService(repository, Clock.fixed(NOW, ZoneOffset.UTC));
    MDC.put("correlationId", "request-1404");
  }

  @AfterEach
  void clearMdc() {
    MDC.clear();
  }

  @Test
  void recordsContentFreeActivityWithRequestCorrelation() {
    UUID userId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();

    var result =
        service.record(
            new ProductActivityCommand(
                userId,
                userId,
                ActivityEventType.COMMENT_CREATED,
                ActivitySubjectType.TASK,
                taskId));

    assertThat(result.id()).isNotNull();
    assertThat(result.userId()).isEqualTo(userId);
    assertThat(result.actorUserId()).isEqualTo(userId);
    assertThat(result.subjectId()).isEqualTo(taskId);
    assertThat(result.correlationId()).isEqualTo("request-1404");
    assertThat(result.occurredAt()).isEqualTo(NOW);
  }

  @Test
  void subjectQueryIsUserScopedStableAndBounded() {
    UUID owner = UUID.randomUUID();
    UUID otherUser = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    service.record(command(owner, taskId, ActivityEventType.COMMENT_CREATED));
    service.record(command(owner, taskId, ActivityEventType.COMMENT_UPDATED));
    service.record(command(otherUser, taskId, ActivityEventType.COMMENT_DELETED));

    PageResponse<?> firstPage =
        service.findBySubject(owner, ActivitySubjectType.TASK, taskId, 0, 1);

    assertThat(firstPage.items()).hasSize(1);
    assertThat(firstPage.totalItems()).isEqualTo(2);
    assertThat(firstPage.totalPages()).isEqualTo(2);
    assertThat(service.countBySubject(owner, ActivitySubjectType.TASK, taskId)).isEqualTo(2);
    assertThat(service.countBySubject(otherUser, ActivitySubjectType.TASK, taskId)).isOne();
  }

  @Test
  void rejectsInvalidPaginationAndCrossActorActivity() {
    UUID owner = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();

    assertThatThrownBy(() -> service.findBySubject(owner, ActivitySubjectType.TASK, taskId, -1, 10))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("page");
    assertThatThrownBy(
            () ->
                service.findBySubject(
                    owner,
                    ActivitySubjectType.TASK,
                    taskId,
                    0,
                    ProductActivityService.MAX_PAGE_SIZE + 1))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("size");
    assertThatThrownBy(
            () ->
                new ProductActivityCommand(
                    owner,
                    UUID.randomUUID(),
                    ActivityEventType.TASK_UPDATED,
                    ActivitySubjectType.TASK,
                    taskId))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("actorUserId");
  }

  @Test
  void unsafeMdcValueIsNeverPersisted() {
    MDC.put("correlationId", "secret token with spaces");
    UUID owner = UUID.randomUUID();

    var recorded =
        service.record(command(owner, UUID.randomUUID(), ActivityEventType.TASK_UPDATED));

    assertThat(recorded.correlationId())
        .matches("[A-Za-z0-9][A-Za-z0-9._-]{0,63}")
        .doesNotContain("secret");
  }

  private static ProductActivityCommand command(
      UUID userId, UUID taskId, ActivityEventType eventType) {
    return new ProductActivityCommand(userId, userId, eventType, ActivitySubjectType.TASK, taskId);
  }
}
