package tech.buildwithpartha.lifeos.comment.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.comment.domain.Comment;
import tech.buildwithpartha.lifeos.comment.domain.CommentFormat;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaCommentRepositoryTests {

  @Autowired private CommentJpaRepository jpa;

  @Test
  void taskAndProjectCommentsRoundTripThroughSeparateParentColumns() {
    JpaCommentRepository repository = new JpaCommentRepository(jpa);
    UUID userId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-23T10:00:00Z");

    Comment taskComment =
        repository.save(
            Comment.create(
                UUID.randomUUID(),
                userId,
                CommentParentType.TASK,
                taskId,
                "Task body",
                CommentFormat.PLAIN_TEXT,
                now));
    Comment projectComment =
        repository.save(
            Comment.create(
                UUID.randomUUID(),
                userId,
                CommentParentType.PROJECT,
                projectId,
                "**Project body**",
                CommentFormat.MARKDOWN,
                now.plusSeconds(1)));

    assertThat(repository.findOwned(taskComment.id(), userId, CommentParentType.TASK, taskId))
        .contains(taskComment);
    assertThat(
            repository.findOwned(projectComment.id(), userId, CommentParentType.PROJECT, projectId))
        .contains(projectComment);
    assertThat(repository.findOwned(taskComment.id(), userId, CommentParentType.PROJECT, projectId))
        .isEmpty();
  }

  @Test
  void pageAndCountStayUserScopedWithStableNewestFirstOrder() {
    JpaCommentRepository repository = new JpaCommentRepository(jpa);
    UUID owner = UUID.randomUUID();
    UUID otherUser = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-23T10:00:00Z");
    Comment older = save(repository, owner, taskId, "Older", now);
    Comment newer = save(repository, owner, taskId, "Newer", now.plusSeconds(1));
    save(repository, otherUser, taskId, "Other", now.plusSeconds(2));

    assertThat(repository.findPage(owner, CommentParentType.TASK, taskId, 0, 10))
        .extracting(Comment::id)
        .containsExactly(newer.id(), older.id());
    assertThat(repository.count(owner, CommentParentType.TASK, taskId)).isEqualTo(2);
    assertThat(repository.count(otherUser, CommentParentType.TASK, taskId)).isOne();
  }

  @Test
  void updateIncrementsVersionAndDeletePurgesTheRow() {
    JpaCommentRepository repository = new JpaCommentRepository(jpa);
    UUID owner = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-23T10:00:00Z");
    Comment created = save(repository, owner, taskId, "Initial", now);

    Comment updated =
        repository.save(created.edit("Updated", CommentFormat.PLAIN_TEXT, now.plusSeconds(1)));

    assertThat(updated.version()).isOne();
    assertThat(updated.editedAt()).contains(now.plusSeconds(1));
    repository.delete(updated);
    assertThat(repository.findOwned(updated.id(), owner, CommentParentType.TASK, taskId)).isEmpty();
  }

  private static Comment save(
      JpaCommentRepository repository, UUID userId, UUID taskId, String body, Instant createdAt) {
    return repository.save(
        new Comment(
            UUID.randomUUID(),
            userId,
            CommentParentType.TASK,
            taskId,
            body,
            CommentFormat.PLAIN_TEXT,
            createdAt,
            createdAt,
            Optional.empty(),
            0));
  }
}
