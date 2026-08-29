package tech.buildwithpartha.lifeos.note.domain;

import java.util.List;
import java.util.Objects;

/** Domain query result container containing paginated Notes and total count. */
public record NoteQueryResult(List<Note> notes, long totalItems) {

  public NoteQueryResult {
    Objects.requireNonNull(notes, "notes must not be null");
  }
}
