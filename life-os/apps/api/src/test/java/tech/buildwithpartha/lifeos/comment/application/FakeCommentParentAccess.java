package tech.buildwithpartha.lifeos.comment.application;

import java.util.List;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.comment.CommentParentAccess;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;

final class FakeCommentParentAccess implements CommentParentAccess {

  private final CommentParentType type;
  boolean writable = true;

  FakeCommentParentAccess(CommentParentType type) {
    this.type = type;
  }

  @Override
  public CommentParentType parentType() {
    return type;
  }

  @Override
  public void requireReadable(UUID userId, UUID parentId) {}

  @Override
  public void requireWritable(UUID userId, UUID parentId) {
    if (!writable) {
      throw new FieldValidationException(
          "Parent is read-only", List.of(new FieldProblem("parentId", "READ_ONLY")));
    }
  }
}
