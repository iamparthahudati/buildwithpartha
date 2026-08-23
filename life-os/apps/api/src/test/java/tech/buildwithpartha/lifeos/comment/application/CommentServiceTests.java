package tech.buildwithpartha.lifeos.comment.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.comment.domain.Comment;
import tech.buildwithpartha.lifeos.comment.domain.CommentFormat;
import tech.buildwithpartha.lifeos.common.activity.ActivityEventType;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;

class CommentServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-23T10:00:00Z");

  private FakeCommentRepository repository;
  private FakeProductActivityPort activityPort;
  private FakeCommentParentAccess taskAccess;
  private CommentService service;

  @BeforeEach
  void setUp() {
    repository = new FakeCommentRepository();
    activityPort = new FakeProductActivityPort();
    taskAccess = new FakeCommentParentAccess(CommentParentType.TASK);
    service =
        new CommentService(
            repository,
            activityPort,
            List.of(taskAccess, new FakeCommentParentAccess(CommentParentType.PROJECT)),
            Clock.fixed(NOW, ZoneOffset.UTC));
  }

  @Test
  void createsSanitizedMarkdownAndEmitsBodyFreeActivity() {
    UUID userId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();

    Comment created =
        service.create(
            userId,
            CommentParentType.TASK,
            taskId,
            "<script>bad</script> [run](javascript:alert(1))",
            CommentFormat.MARKDOWN);

    assertThat(created.body()).isEqualTo("&lt;script&gt;bad&lt;/script&gt; run");
    assertThat(activityPort.commands)
        .singleElement()
        .satisfies(
            command -> {
              assertThat(command.eventType()).isEqualTo(ActivityEventType.COMMENT_CREATED);
              assertThat(command.subjectType()).isEqualTo(ActivitySubjectType.TASK);
              assertThat(command.subjectId()).isEqualTo(taskId);
            });
    assertThat(activityPort.commands.getFirst().getClass().getRecordComponents())
        .extracting(java.lang.reflect.RecordComponent::getName)
        .doesNotContain("body");
  }

  @Test
  void listsOnlyRequestedUserParentAndUsesBoundedPagination() {
    UUID userId = UUID.randomUUID();
    UUID otherUser = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    service.create(userId, CommentParentType.TASK, taskId, "One", CommentFormat.PLAIN_TEXT);
    service.create(userId, CommentParentType.TASK, taskId, "Two", CommentFormat.PLAIN_TEXT);
    service.create(otherUser, CommentParentType.TASK, taskId, "Other", CommentFormat.PLAIN_TEXT);

    var page = service.list(userId, CommentParentType.TASK, taskId, 0, 1);

    assertThat(page.items()).hasSize(1);
    assertThat(page.totalItems()).isEqualTo(2);
    assertThat(service.count(userId, CommentParentType.TASK, taskId)).isEqualTo(2);
    assertThatThrownBy(
            () ->
                service.list(
                    userId, CommentParentType.TASK, taskId, 0, CommentService.MAX_PAGE_SIZE + 1))
        .isInstanceOf(FieldValidationException.class);
  }

  @Test
  void updateRequiresCurrentVersionAndTracksEdit() {
    UUID userId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    Comment created =
        service.create(userId, CommentParentType.TASK, taskId, "Initial", CommentFormat.PLAIN_TEXT);

    Comment updated =
        service.update(
            userId,
            CommentParentType.TASK,
            taskId,
            created.id(),
            "Updated",
            CommentFormat.PLAIN_TEXT,
            created.version());

    assertThat(updated.body()).isEqualTo("Updated");
    assertThat(updated.version()).isOne();
    assertThat(updated.editedAt()).contains(NOW);
    assertThat(activityPort.commands.getLast().eventType())
        .isEqualTo(ActivityEventType.COMMENT_UPDATED);
    assertThatThrownBy(
            () ->
                service.update(
                    userId,
                    CommentParentType.TASK,
                    taskId,
                    created.id(),
                    "Stale",
                    CommentFormat.PLAIN_TEXT,
                    0))
        .isInstanceOf(ConcurrencyConflictException.class);
  }

  @Test
  void deleteIsOwnerScopedVersionedAndImmediatelyPurgesBody() {
    UUID userId = UUID.randomUUID();
    UUID otherUser = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    Comment created =
        service.create(userId, CommentParentType.TASK, taskId, "Private", CommentFormat.PLAIN_TEXT);

    assertThatThrownBy(
            () ->
                service.delete(
                    otherUser, CommentParentType.TASK, taskId, created.id(), created.version()))
        .isInstanceOf(ResourceNotFoundException.class);
    assertThatThrownBy(
            () ->
                service.delete(
                    userId, CommentParentType.TASK, taskId, created.id(), created.version() + 1))
        .isInstanceOf(ConcurrencyConflictException.class);

    service.delete(userId, CommentParentType.TASK, taskId, created.id(), created.version());

    assertThat(repository.findOwned(created.id(), userId, CommentParentType.TASK, taskId))
        .isEmpty();
    assertThat(activityPort.commands.getLast().eventType())
        .isEqualTo(ActivityEventType.COMMENT_DELETED);
  }

  @Test
  void archivedParentIsReadOnlyButExistingCommentMayStillBeDeleted() {
    UUID userId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    Comment created =
        service.create(userId, CommentParentType.TASK, taskId, "Private", CommentFormat.PLAIN_TEXT);
    taskAccess.writable = false;

    assertThatThrownBy(
            () ->
                service.update(
                    userId,
                    CommentParentType.TASK,
                    taskId,
                    created.id(),
                    "No",
                    CommentFormat.PLAIN_TEXT,
                    created.version()))
        .isInstanceOf(FieldValidationException.class);

    service.delete(userId, CommentParentType.TASK, taskId, created.id(), created.version());
    assertThat(service.count(userId, CommentParentType.TASK, taskId)).isZero();
  }

  @Test
  void invalidControlCharacterBecomesSafeFieldProblem() {
    assertThatThrownBy(
            () ->
                service.create(
                    UUID.randomUUID(),
                    CommentParentType.TASK,
                    UUID.randomUUID(),
                    "bad\u0000body",
                    CommentFormat.PLAIN_TEXT))
        .isInstanceOf(FieldValidationException.class)
        .satisfies(
            exception ->
                assertThat(((FieldValidationException) exception).errors())
                    .extracting(problem -> problem.field() + ":" + problem.code())
                    .containsExactly("body:UNSAFE_OR_INVALID"));
  }
}
