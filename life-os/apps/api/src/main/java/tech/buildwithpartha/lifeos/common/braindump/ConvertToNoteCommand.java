package tech.buildwithpartha.lifeos.common.braindump;

import java.util.Set;
import java.util.UUID;

public record ConvertToNoteCommand(String title, String body, Set<UUID> labelIds) {}
