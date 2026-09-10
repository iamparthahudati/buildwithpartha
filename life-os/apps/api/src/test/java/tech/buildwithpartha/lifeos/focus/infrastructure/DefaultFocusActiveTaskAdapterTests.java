package tech.buildwithpartha.lifeos.focus.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.focus.domain.FocusSession;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionRepository;

class DefaultFocusActiveTaskAdapterTests {

  private FocusSessionRepository focusSessionRepository;
  private DefaultFocusActiveTaskAdapter adapter;

  @BeforeEach
  void setUp() {
    focusSessionRepository = mock(FocusSessionRepository.class);
    adapter = new DefaultFocusActiveTaskAdapter(focusSessionRepository);
  }

  @Test
  void retrievesActiveFocusTaskId() {
    UUID userId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    Instant now = Instant.parse("2026-09-10T10:00:00Z");

    FocusSession session =
        FocusSession.start(
            UUID.randomUUID(),
            userId,
            Optional.of(taskId),
            Optional.empty(),
            Duration.ofMinutes(25),
            Duration.ofMinutes(5),
            now);

    given(focusSessionRepository.findActiveByUserId(userId)).willReturn(Optional.of(session));

    Optional<UUID> activeTaskId = adapter.getActiveFocusTaskId(userId);

    assertThat(activeTaskId).isPresent();
    assertThat(activeTaskId.get()).isEqualTo(taskId);
  }

  @Test
  void returnsEmptyWhenNoActiveSession() {
    UUID userId = UUID.randomUUID();

    given(focusSessionRepository.findActiveByUserId(userId)).willReturn(Optional.empty());

    Optional<UUID> activeTaskId = adapter.getActiveFocusTaskId(userId);

    assertThat(activeTaskId).isEmpty();
  }
}
