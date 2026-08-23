package tech.buildwithpartha.lifeos.common.comment;

import java.util.UUID;

/** Cross-domain read boundary for aggregate Comment counts. */
public interface CommentCountPort {
  long count(UUID userId, CommentParentType parentType, UUID parentId);
}
