package tech.buildwithpartha.lifeos.timeblock.application;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.time.WeeklyPlanSchedulePort;
import tech.buildwithpartha.lifeos.common.time.WeeklyPlanTimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

/** Time Block-owned adapter for Weekly Plan overlap preflight. */
@Component
public class WeeklyPlanScheduleAdapter implements WeeklyPlanSchedulePort {
  private final TimeBlockRepository repository;

  public WeeklyPlanScheduleAdapter(TimeBlockRepository repository) {
    this.repository = repository;
  }

  @Override
  public List<WeeklyPlanTimeBlock> getScheduledBlocks(UUID userId, Instant start, Instant end) {
    return repository.findByUserIdAndRange(userId, start, end).stream()
        .filter(block -> block.status() != TimeBlockStatus.CANCELLED)
        .map(block -> new WeeklyPlanTimeBlock(block.id(), block.startAt(), block.endAt()))
        .toList();
  }
}
