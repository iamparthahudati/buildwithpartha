package tech.buildwithpartha.lifeos.notification.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.common.mail.MailMessageKind;
import tech.buildwithpartha.lifeos.notification.domain.OutboxMessageStatus;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OutboxMessageRepositoryTests {

  @Autowired private OutboxMessageJpaRepository repository;

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void templateVariablesRoundTripThroughTheJsonConverter() {
    OutboxMessageEntity entity = entity(UUID.randomUUID(), OutboxMessageStatus.PENDING, NOW, NOW);
    repository.saveAndFlush(entity);
    repository.flush();

    OutboxMessageEntity reloaded = repository.findById(entity.getId()).orElseThrow();

    assertThat(reloaded.getTemplateVariables()).containsEntry("token", "abc123");
  }

  @Test
  void findDueForDispatchReturnsOnlyDuePendingMessagesOrderedByNextAttempt() {
    OutboxMessageEntity dueEarlier =
        entity(
            UUID.randomUUID(), OutboxMessageStatus.PENDING, NOW.minus(10, ChronoUnit.MINUTES), NOW);
    OutboxMessageEntity dueLater =
        entity(
            UUID.randomUUID(), OutboxMessageStatus.PENDING, NOW.minus(5, ChronoUnit.MINUTES), NOW);
    OutboxMessageEntity notYetDue =
        entity(UUID.randomUUID(), OutboxMessageStatus.PENDING, NOW.plus(1, ChronoUnit.HOURS), NOW);
    OutboxMessageEntity alreadySent =
        entity(UUID.randomUUID(), OutboxMessageStatus.SENT, NOW.minus(10, ChronoUnit.MINUTES), NOW);
    repository.saveAllAndFlush(List.of(dueEarlier, dueLater, notYetDue, alreadySent));

    List<OutboxMessageEntity> due = repository.findDueForDispatch(NOW, 10);

    assertThat(due)
        .extracting(OutboxMessageEntity::getId)
        .containsExactly(dueEarlier.getId(), dueLater.getId());
  }

  @Test
  void deleteTerminalOlderThanRemovesOnlyQualifyingRows() {
    OutboxMessageEntity oldSent =
        entity(UUID.randomUUID(), OutboxMessageStatus.SENT, NOW, NOW.minus(8, ChronoUnit.DAYS));
    OutboxMessageEntity recentSent =
        entity(UUID.randomUUID(), OutboxMessageStatus.SENT, NOW, NOW.minus(1, ChronoUnit.HOURS));
    OutboxMessageEntity oldPending =
        entity(UUID.randomUUID(), OutboxMessageStatus.PENDING, NOW, NOW.minus(8, ChronoUnit.DAYS));
    repository.saveAllAndFlush(List.of(oldSent, recentSent, oldPending));

    int deleted = repository.deleteTerminalOlderThan(NOW.minus(7, ChronoUnit.DAYS));
    repository.flush();

    assertThat(deleted).isEqualTo(1);
    assertThat(repository.findById(oldSent.getId())).isEmpty();
    assertThat(repository.findById(recentSent.getId())).isPresent();
    assertThat(repository.findById(oldPending.getId())).isPresent();
  }

  private static OutboxMessageEntity entity(
      UUID id, OutboxMessageStatus status, Instant nextAttemptAt, Instant updatedAt) {
    return new OutboxMessageEntity(
        id,
        null,
        MailMessageKind.EMAIL_VERIFICATION,
        "user@example.test",
        Map.of("token", "abc123"),
        status,
        0,
        nextAttemptAt,
        null,
        null,
        null,
        null,
        null,
        NOW,
        updatedAt);
  }
}
