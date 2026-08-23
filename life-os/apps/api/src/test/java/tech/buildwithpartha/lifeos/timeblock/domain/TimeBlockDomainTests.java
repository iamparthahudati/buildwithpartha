package tech.buildwithpartha.lifeos.timeblock.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockDomainFixture.aTimeBlock;

import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class TimeBlockDomainTests {

  @Test
  @DisplayName("TimeBlock constructor validates mandatory fields, non-blank strings, and ordering")
  void validatesInvariants() {
    assertThatThrownBy(() -> aTimeBlock().withTitle("   ").build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("title must not be blank");

    assertThatThrownBy(() -> aTimeBlock().withCategory("  ").build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("category must not be blank");

    Instant now = Instant.now();
    assertThatThrownBy(() -> aTimeBlock().withStartAt(now).withEndAt(now).build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("endAt must be strictly after startAt");

    assertThatThrownBy(() -> aTimeBlock().withStartAt(now).withEndAt(now.minusSeconds(60)).build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("endAt must be strictly after startAt");

    assertThatThrownBy(() -> aTimeBlock().withSourceTimeZone("Invalid/Timezone_Name").build())
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Invalid sourceTimeZone");
  }

  @Test
  @DisplayName("durationMinutes correctly calculates interval duration in minutes")
  void calculatesDurationMinutes() {
    Instant start = Instant.parse("2026-08-24T09:00:00Z");
    Instant end = Instant.parse("2026-08-24T10:45:00Z");
    TimeBlock block = aTimeBlock().withStartAt(start).withEndAt(end).build();

    assertThat(block.durationMinutes()).isEqualTo(105L);
  }

  @Test
  @DisplayName(
      "isOvernight evaluates whether block spans local midnight in source or target timezone")
  void evaluatesOvernightSpans() {
    // 23:00 to 01:00 UTC next day
    Instant start = Instant.parse("2026-08-24T23:00:00Z");
    Instant end = Instant.parse("2026-08-25T01:00:00Z");

    TimeBlock utcBlock =
        aTimeBlock().withStartAt(start).withEndAt(end).withSourceTimeZone("UTC").build();
    assertThat(utcBlock.isOvernight()).isTrue();

    // 14:00 to 16:00 UTC is same day in UTC, but overnight in Tokyo (23:00 to 01:00 JST next day)
    Instant dayStart = Instant.parse("2026-08-24T14:00:00Z");
    Instant dayEnd = Instant.parse("2026-08-24T16:00:00Z");
    TimeBlock dayBlock =
        aTimeBlock().withStartAt(dayStart).withEndAt(dayEnd).withSourceTimeZone("UTC").build();

    assertThat(dayBlock.isOvernight()).isFalse();
    assertThat(dayBlock.isOvernight(ZoneId.of("Asia/Tokyo"))).isTrue();
  }

  @Test
  @DisplayName("spansDstTransition detects daylight saving time transitions")
  void detectsDstTransitions() {
    // Spring Forward in US Eastern (2026-03-08 at 02:00 local time)
    // 2026-03-08T06:00:00Z = 01:00 EST (UTC-5)
    // 2026-03-08T08:00:00Z = 04:00 EDT (UTC-4)
    Instant springStart = Instant.parse("2026-03-08T06:00:00Z");
    Instant springEnd = Instant.parse("2026-03-08T08:00:00Z");
    TimeBlock dstBlock =
        aTimeBlock()
            .withStartAt(springStart)
            .withEndAt(springEnd)
            .withSourceTimeZone("America/New_York")
            .build();

    assertThat(dstBlock.spansDstTransition()).isTrue();

    // Normal non-DST day
    Instant normalStart = Instant.parse("2026-08-24T09:00:00Z");
    Instant normalEnd = Instant.parse("2026-08-24T10:00:00Z");
    TimeBlock normalBlock =
        aTimeBlock()
            .withStartAt(normalStart)
            .withEndAt(normalEnd)
            .withSourceTimeZone("America/New_York")
            .build();

    assertThat(normalBlock.spansDstTransition()).isFalse();
  }

  @Test
  @DisplayName(
      "overlaps correctly evaluates interval collisions between time blocks and time ranges")
  void evaluatesOverlaps() {
    TimeBlock block1 =
        aTimeBlock()
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .build();

    TimeBlock overlapping =
        aTimeBlock()
            .withStartAt(Instant.parse("2026-08-24T09:30:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:30:00Z"))
            .build();

    TimeBlock touching =
        aTimeBlock()
            .withStartAt(Instant.parse("2026-08-24T10:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T11:00:00Z"))
            .build();

    TimeBlock separate =
        aTimeBlock()
            .withStartAt(Instant.parse("2026-08-24T11:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T12:00:00Z"))
            .build();

    assertThat(block1.overlaps(overlapping)).isTrue();
    assertThat(block1.overlaps(touching)).isFalse();
    assertThat(block1.overlaps(separate)).isFalse();

    assertThat(
            block1.overlaps(
                Instant.parse("2026-08-24T08:00:00Z"), Instant.parse("2026-08-24T09:15:00Z")))
        .isTrue();
    assertThat(
            block1.overlaps(
                Instant.parse("2026-08-24T10:00:00Z"), Instant.parse("2026-08-24T11:00:00Z")))
        .isFalse();
  }

  @Test
  @DisplayName("isOwnedBy verifies user ownership")
  void verifiesOwnership() {
    UUID ownerId = UUID.randomUUID();
    UUID otherId = UUID.randomUUID();
    TimeBlock block = aTimeBlock().withUserId(ownerId).build();

    assertThat(block.isOwnedBy(ownerId)).isTrue();
    assertThat(block.isOwnedBy(otherId)).isFalse();
  }

  @Test
  @DisplayName("TimeBlockStatus handles lifecycle and parsing correctly")
  void verifiesTimeBlockStatus() {
    assertThat(TimeBlockStatus.SCHEDULED.isTerminal()).isFalse();
    assertThat(TimeBlockStatus.IN_PROGRESS.isTerminal()).isFalse();
    assertThat(TimeBlockStatus.COMPLETED.isTerminal()).isTrue();
    assertThat(TimeBlockStatus.CANCELLED.isTerminal()).isTrue();

    assertThat(TimeBlockStatus.fromDbValue("scheduled")).isEqualTo(TimeBlockStatus.SCHEDULED);
    assertThat(TimeBlockStatus.fromDbValue("IN_PROGRESS")).isEqualTo(TimeBlockStatus.IN_PROGRESS);

    assertThatThrownBy(() -> TimeBlockStatus.fromDbValue("UNKNOWN"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Unknown TimeBlock status");
  }
}
