package tech.buildwithpartha.lifeos.note.application;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToNoteCommand;
import tech.buildwithpartha.lifeos.common.note.BrainDumpNoteCreator;

@Service
public class BrainDumpNoteCreatorAdapter implements BrainDumpNoteCreator {

  private final NoteService noteService;

  public BrainDumpNoteCreatorAdapter(NoteService noteService) {
    this.noteService = noteService;
  }

  @Override
  public UUID createNote(UUID userId, ConvertToNoteCommand command) {
    CreateNoteCommand serviceCommand =
        new CreateNoteCommand(command.title(), command.body(), command.labelIds(), List.of());
    return noteService.createNote(userId, serviceCommand).id();
  }
}
