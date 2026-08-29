package tech.buildwithpartha.lifeos.common.note;

import java.util.UUID;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToNoteCommand;

public interface BrainDumpNoteCreator {
  UUID createNote(UUID userId, ConvertToNoteCommand command);
}
