package tech.buildwithpartha.lifeos.note.domain;

import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Query parameters record for filtering, searching and paginating Notes. */
public record NoteQuery(
    UUID userId,
    String q,
    Boolean pinned,
    Boolean archived,
    Set<UUID> labelIds,
    int page,
    int size,
    String sortBy,
    String sortDirection) {

  public NoteQuery {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(labelIds, "labelIds must not be null");
  }

  @Override
  public String toString() {
    return "NoteQuery[userId="
        + userId
        + ", q=[REDACTED]"
        + ", pinned="
        + pinned
        + ", archived="
        + archived
        + ", labelIds="
        + labelIds
        + ", page="
        + page
        + ", size="
        + size
        + ", sortBy="
        + sortBy
        + ", sortDirection="
        + sortDirection
        + "]";
  }
}
