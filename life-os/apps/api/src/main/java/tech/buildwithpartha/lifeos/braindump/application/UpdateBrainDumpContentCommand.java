package tech.buildwithpartha.lifeos.braindump.application;

import java.util.Objects;

/** Command payload for updating the content of a Brain Dump item. */
public record UpdateBrainDumpContentCommand(String content) {

  public UpdateBrainDumpContentCommand {
    Objects.requireNonNull(content, "content must not be null");
    if (content.trim().isEmpty()) {
      throw new IllegalArgumentException("content must not be blank");
    }
  }
}
