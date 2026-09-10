package tech.buildwithpartha.lifeos.timeblock.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTodayPort.TodayTimeBlockRecord;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

class DefaultTimeBlockTodayAdapterTests {

  private TimeBlockRepository timeBlockRepository;
  private DefaultTimeBlockTodayAdapter adapter;

  @BeforeEach
  void setUp() {
    timeBlockRepository = mock(TimeBlockRepository.class);
    adapter = new DefaultTimeBlockTodayAdapter(timeBlockRepository);
  }

  @Test
  void retrievesTimeBlocksForRange() {
    UUID userId = UUID.randomUUID();
    UUID blockId = UUID.randomUUID();
    ZoneId zoneId = ZoneId.of("UTC");
    Instant start = Instant.parse("2026-09-10T00:00:00Z");
    Instant end = Instant.parse("2026-09-11T00:00:00Z");

    TimeBlock block =
        new TimeBlock(
            blockId,
            userId,
            Optional.empty(),
            Optional.empty(),
            "Morning Planning",
            "PLANNING",
            TimeBlockStatus.SCHEDULED,
            Instant.parse("2026-09-10T08:00:00Z"),
            Instant.parse("2026-09-10T09:00:00Z"),
            "UTC",
            Optional.empty(),
            Instant.now(),
            Instant.now(),
            1L);

    given(timeBlockRepository.findByUserIdAndRange(userId, start, end)).willReturn(List.of(block));

    List<TodayTimeBlockRecord> result = adapter.getTodayTimeBlocks(userId, start, end, zoneId);

    assertThat(result).hasSize(1);
    assertThat(result.get(0).id()).isEqualTo(blockId);
    assertThat(result.get(0).title()).isEqualTo("Morning Planning");
    assertThat(result.get(0).startTime()).isEqualTo(LocalTime.of(8, 0));
    assertThat(result.get(0).endTime()).isEqualTo(LocalTime.of(9, 0));
    assertThat(result.get(0).completed()).isFalse();
  }
}
