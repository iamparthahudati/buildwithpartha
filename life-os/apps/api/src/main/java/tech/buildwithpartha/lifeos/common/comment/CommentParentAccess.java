package tech.buildwithpartha.lifeos.common.comment;

import java.util.UUID;

/** Domain-neutral ownership/lifecycle check implemented by each supported parent domain. */
public interface CommentParentAccess {

  CommentParentType parentType();

  /** Requires a visible parent owned by the Account; missing/cross-user parents are identical. */
  void requireReadable(UUID userId, UUID parentId);

  /** Additionally rejects a parent whose lifecycle makes comments read-only. */
  void requireWritable(UUID userId, UUID parentId);
}
