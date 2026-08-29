package tech.buildwithpartha.lifeos.note.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import tech.buildwithpartha.lifeos.note.application.UpdateNoteCommand;

/** Request payload to update an existing Note. */
public record UpdateNoteRequest(
    @NotBlank(message = "Title must not be blank") String title,
    @NotNull(message = "Body must not be null") String body,
    @NotNull(message = "labelIds must not be null") Set<UUID> labelIds,
    @NotNull(message = "links must not be null") @Valid List<NoteLinkRequest> links,
    @NotNull(message = "version must not be null") Long version) {

  public UpdateNoteCommand toCommand() {
    List<UpdateNoteCommand.LinkRecord> linkRecords =
        links.stream()
            .map(l -> new UpdateNoteCommand.LinkRecord(l.targetType(), l.targetId()))
            .toList();
    return new UpdateNoteCommand(title, body, labelIds, linkRecords);
  }

  @Override
  public String toString() {
    return "UpdateNoteRequest[title="
        + title
        + ", body=[REDACTED]"
        + ", labelIds="
        + labelIds
        + ", links="
        + links
        + ", version="
        + version
        + "]";
  }
}
