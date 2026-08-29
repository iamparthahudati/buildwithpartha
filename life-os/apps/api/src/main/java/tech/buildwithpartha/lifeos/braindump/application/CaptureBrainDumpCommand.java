package tech.buildwithpartha.lifeos.braindump.application;

import java.util.Objects;

/** Command payload for capturing a new Brain Dump item. */
public record CaptureBrainDumpCommand(String content) {

  public CaptureBrainDumpCommand {
    Objects.requireNonNull(content, "content must not be null");
    if (content.trim().isEmpty()) {
      throw new IllegalArgumentException("content must not be blank");
    }
  }
}
