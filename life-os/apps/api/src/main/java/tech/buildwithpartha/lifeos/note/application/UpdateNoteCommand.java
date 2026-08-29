package tech.buildwithpartha.lifeos.note.application;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import tech.buildwithpartha.lifeos.note.domain.NoteLinkTargetType;

/** Command parameters to update an existing Note. */
public record UpdateNoteCommand(
    String title, String body, Set<UUID> labelIds, List<LinkRecord> links) {

  public UpdateNoteCommand {
    Objects.requireNonNull(title, "title must not be null");
    Objects.requireNonNull(body, "body must not be null");
    Objects.requireNonNull(labelIds, "labelIds must not be null");
    Objects.requireNonNull(links, "links must not be null");
  }

  public record LinkRecord(NoteLinkTargetType targetType, UUID targetId) {
    public LinkRecord {
      Objects.requireNonNull(targetType, "targetType must not be null");
      Objects.requireNonNull(targetId, "targetId must not be null");
    }
  }

  @Override
  public String toString() {
    return "UpdateNoteCommand[title="
        + title
        + ", body=[REDACTED]"
        + ", labelIds="
        + labelIds
        + ", links="
        + links
        + "]";
  }
}
