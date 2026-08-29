package tech.buildwithpartha.lifeos.braindump.infrastructure;

import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.braindump.BrainDumpCountProvider;

@Component
public class BrainDumpCountAdapter implements BrainDumpCountProvider {

  private final BrainDumpItemJpaRepository jpaRepository;

  public BrainDumpCountAdapter(BrainDumpItemJpaRepository jpaRepository) {
    this.jpaRepository = Objects.requireNonNull(jpaRepository, "jpaRepository must not be null");
  }

  @Override
  public int getUnprocessedCount(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.countUnprocessedByUserId(userId);
  }
}
