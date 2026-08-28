package tech.buildwithpartha.lifeos.comment.application;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.comment.domain.Comment;
import tech.buildwithpartha.lifeos.comment.domain.CommentRepository;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;

final class FakeCommentRepository implements CommentRepository {

  private final List<Comment> comments = new ArrayList<>();

  @Override
  public Comment save(Comment comment) {
    Optional<Comment> current =
        comments.stream().filter(item -> item.id().equals(comment.id())).findFirst();
    comments.removeIf(item -> item.id().equals(comment.id()));
    Comment saved = current.isEmpty() ? comment : withVersion(comment, current.get().version() + 1);
    comments.add(saved);
    return saved;
  }

  @Override
  public Optional<Comment> findOwned(
      UUID id, UUID userId, CommentParentType parentType, UUID parentId) {
    return comments.stream()
        .filter(comment -> comment.id().equals(id))
        .filter(comment -> comment.userId().equals(userId))
        .filter(comment -> comment.parentType() == parentType)
        .filter(comment -> comment.parentId().equals(parentId))
        .findFirst();
  }

  @Override
  public List<Comment> findPage(
      UUID userId, CommentParentType parentType, UUID parentId, int page, int size) {
    return comments.stream()
        .filter(comment -> comment.userId().equals(userId))
        .filter(comment -> comment.parentType() == parentType)
        .filter(comment -> comment.parentId().equals(parentId))
        .sorted(Comparator.comparing(Comment::createdAt).thenComparing(Comment::id).reversed())
        .skip((long) page * size)
        .limit(size)
        .toList();
  }

  @Override
  public long count(UUID userId, CommentParentType parentType, UUID parentId) {
    return comments.stream()
        .filter(comment -> comment.userId().equals(userId))
        .filter(comment -> comment.parentType() == parentType)
        .filter(comment -> comment.parentId().equals(parentId))
        .count();
  }

  @Override
  public void delete(Comment comment) {
    comments.removeIf(item -> item.id().equals(comment.id()));
  }

  private static Comment withVersion(Comment comment, long version) {
    return new Comment(
        comment.id(),
        comment.userId(),
        comment.parentType(),
        comment.parentId(),
        comment.body(),
        comment.format(),
        comment.createdAt(),
        comment.updatedAt(),
        comment.editedAt(),
        version);
  }
}
