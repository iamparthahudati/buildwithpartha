package tech.buildwithpartha.lifeos.comment.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.comment.domain.Comment;
import tech.buildwithpartha.lifeos.comment.domain.CommentFormat;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;

/** Safe API projection of a personal Comment. */
public record CommentResponse(
    @Schema(format = "uuid", requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
    @Schema(format = "uuid", requiredMode = Schema.RequiredMode.REQUIRED) UUID authorId,
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED) CommentParentType parentType,
    @Schema(format = "uuid", requiredMode = Schema.RequiredMode.REQUIRED) UUID parentId,
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String body,
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED) CommentFormat format,
    @Schema(format = "date-time", requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt,
    @Schema(format = "date-time", requiredMode = Schema.RequiredMode.REQUIRED) Instant updatedAt,
    @Schema(format = "date-time", nullable = true) Instant editedAt,
    @Schema(format = "int64", requiredMode = Schema.RequiredMode.REQUIRED) long version,
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean canEdit,
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean canDelete) {

  static CommentResponse fromDomain(Comment comment) {
    return new CommentResponse(
        comment.id(),
        comment.userId(),
        comment.parentType(),
        comment.parentId(),
        comment.body(),
        comment.format(),
        comment.createdAt(),
        comment.updatedAt(),
        comment.editedAt().orElse(null),
        comment.version(),
        true,
        true);
  }
}
