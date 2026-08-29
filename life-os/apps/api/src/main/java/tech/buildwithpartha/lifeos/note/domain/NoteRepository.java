package tech.buildwithpartha.lifeos.note.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Port for loading, persisting, and deleting Notes. */
public interface NoteRepository {

  Note save(Note note);

  Optional<Note> findById(UUID id);

  Optional<Note> findByIdAndUserId(UUID id, UUID userId);

  List<Note> findByUserId(UUID userId);

  NoteQueryResult query(NoteQuery query);

  void delete(Note note);
}
