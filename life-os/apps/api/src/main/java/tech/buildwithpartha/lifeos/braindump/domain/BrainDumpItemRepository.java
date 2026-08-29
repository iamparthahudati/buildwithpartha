package tech.buildwithpartha.lifeos.braindump.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BrainDumpItemRepository {
  BrainDumpItem save(BrainDumpItem item);
  Optional<BrainDumpItem> findById(UUID id);
  Optional<BrainDumpItem> findByIdAndUserId(UUID id, UUID userId);
  int countUnprocessedByUserId(UUID userId);
  void delete(BrainDumpItem item);
  BrainDumpItemQueryResult query(BrainDumpItemQuery query);
}
