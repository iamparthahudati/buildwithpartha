package tech.buildwithpartha.lifeos.common.braindump;

import java.util.UUID;

public interface BrainDumpCountProvider {
  int getUnprocessedCount(UUID userId);
}
