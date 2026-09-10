package tech.buildwithpartha.lifeos.focus.infrastructure;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.focus.FocusActiveTaskPort;
import tech.buildwithpartha.lifeos.focus.domain.FocusSession;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionRepository;

/**
 * Focus domain adapter implementing {@link FocusActiveTaskPort} for Today dashboard queries
 * (LOS-1415).
 */
@Component
public class DefaultFocusActiveTaskAdapter implements FocusActiveTaskPort {

  private final FocusSessionRepository focusSessionRepository;

  public DefaultFocusActiveTaskAdapter(FocusSessionRepository focusSessionRepository) {
    this.focusSessionRepository =
        Objects.requireNonNull(focusSessionRepository, "focusSessionRepository must not be null");
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<UUID> getActiveFocusTaskId(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return focusSessionRepository.findActiveByUserId(userId).flatMap(FocusSession::taskId);
  }
}
