package tech.buildwithpartha.lifeos.comment.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;

/** Persistence boundary for personal Comments. */
public interface CommentRepository {

  Comment save(Comment comment);

  Optional<Comment> findOwned(UUID id, UUID userId, CommentParentType parentType, UUID parentId);

  List<Comment> findPage(
      UUID userId, CommentParentType parentType, UUID parentId, int page, int size);

  long count(UUID userId, CommentParentType parentType, UUID parentId);

  void delete(Comment comment);
}
