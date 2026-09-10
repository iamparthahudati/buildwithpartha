package tech.buildwithpartha.lifeos.timeblock.infrastructure;

import java.time.Instant;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTodayPort;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

/**
 * TimeBlock domain adapter implementing {@link TimeBlockTodayPort} for Today dashboard queries
 * (LOS-1415).
 */
@Component
public class DefaultTimeBlockTodayAdapter implements TimeBlockTodayPort {

  private final TimeBlockRepository timeBlockRepository;

  public DefaultTimeBlockTodayAdapter(TimeBlockRepository timeBlockRepository) {
    this.timeBlockRepository =
        Objects.requireNonNull(timeBlockRepository, "timeBlockRepository must not be null");
  }

  @Override
  @Transactional(readOnly = true)
  public List<TodayTimeBlockRecord> getTodayTimeBlocks(
      UUID userId, Instant rangeStart, Instant rangeEnd, ZoneId zoneId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(rangeStart, "rangeStart must not be null");
    Objects.requireNonNull(rangeEnd, "rangeEnd must not be null");
    Objects.requireNonNull(zoneId, "zoneId must not be null");

    Comparator<TimeBlock> comparator =
        Comparator.comparing(TimeBlock::startAt)
            .thenComparing(TimeBlock::endAt)
            .thenComparing(TimeBlock::id);

    return timeBlockRepository.findByUserIdAndRange(userId, rangeStart, rangeEnd).stream()
        .filter(b -> b.status() != TimeBlockStatus.CANCELLED)
        .sorted(comparator)
        .map(
            b ->
                new TodayTimeBlockRecord(
                    b.id(),
                    b.title(),
                    b.startAt().atZone(zoneId).toLocalTime(),
                    b.endAt().atZone(zoneId).toLocalTime(),
                    b.category(),
                    b.projectId(),
                    b.status() == TimeBlockStatus.COMPLETED,
                    b.startAt(),
                    b.endAt()))
        .toList();
  }
}
