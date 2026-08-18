package tech.buildwithpartha.lifeos.notification.application;

import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import tech.buildwithpartha.lifeos.notification.domain.OutboxMessage;
import tech.buildwithpartha.lifeos.notification.domain.OutboxMessageStatus;
import tech.buildwithpartha.lifeos.notification.domain.OutboxRepository;

final class FakeOutboxRepository implements OutboxRepository {

  private final Map<UUID, OutboxMessage> messages = new LinkedHashMap<>();

  @Override
  public OutboxMessage save(OutboxMessage message) {
    messages.put(message.id(), message);
    return message;
  }

  @Override
  public List<OutboxMessage> findDueForDispatch(Instant now, int limit) {
    return messages.values().stream()
        .filter(message -> message.isDueForDispatch(now))
        .sorted(Comparator.comparing(OutboxMessage::nextAttemptAt))
        .limit(limit)
        .toList();
  }

  @Override
  public int deleteTerminalOlderThan(Instant cutoff) {
    List<UUID> toDelete =
        messages.values().stream()
            .filter(
                message ->
                    (message.status() == OutboxMessageStatus.SENT
                            || message.status() == OutboxMessageStatus.DEAD_LETTERED)
                        && message.updatedAt().isBefore(cutoff))
            .map(OutboxMessage::id)
            .toList();
    toDelete.forEach(messages::remove);
    return toDelete.size();
  }

  OutboxMessage get(UUID id) {
    return messages.get(id);
  }

  Collection<OutboxMessage> all() {
    return messages.values();
  }
}
