package tech.buildwithpartha.lifeos.comment.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;

class CommentTests {

  @Test
  void createAndEditPreserveIdentityAndTrackEditedInstant() {
    Instant createdAt = Instant.parse("2026-08-23T10:00:00Z");
    Instant editedAt = createdAt.plusSeconds(30);
    Comment comment =
        Comment.create(
            UUID.randomUUID(),
            UUID.randomUUID(),
            CommentParentType.TASK,
            UUID.randomUUID(),
            "Initial",
            CommentFormat.PLAIN_TEXT,
            createdAt);

    Comment edited = comment.edit("**Updated**", CommentFormat.MARKDOWN, editedAt);

    assertThat(edited.id()).isEqualTo(comment.id());
    assertThat(edited.body()).isEqualTo("**Updated**");
    assertThat(edited.createdAt()).isEqualTo(createdAt);
    assertThat(edited.updatedAt()).isEqualTo(editedAt);
    assertThat(edited.editedAt()).contains(editedAt);
    assertThat(edited.version()).isZero();
  }

  @Test
  void invariantRejectsBlankBodyAndNegativeVersion() {
    Instant now = Instant.parse("2026-08-23T10:00:00Z");
    assertThatThrownBy(
            () ->
                new Comment(
                    UUID.randomUUID(),
                    UUID.randomUUID(),
                    CommentParentType.PROJECT,
                    UUID.randomUUID(),
                    " ",
                    CommentFormat.PLAIN_TEXT,
                    now,
                    now,
                    java.util.Optional.empty(),
                    0))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(
            () ->
                new Comment(
                    UUID.randomUUID(),
                    UUID.randomUUID(),
                    CommentParentType.PROJECT,
                    UUID.randomUUID(),
                    "Body",
                    CommentFormat.PLAIN_TEXT,
                    now,
                    now,
                    java.util.Optional.empty(),
                    -1))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
