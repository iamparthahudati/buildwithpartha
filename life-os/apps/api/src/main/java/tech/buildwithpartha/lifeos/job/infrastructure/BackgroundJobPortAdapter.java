package tech.buildwithpartha.lifeos.job.infrastructure;

import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobKind;
import tech.buildwithpartha.lifeos.common.job.BackgroundJobPort;
import tech.buildwithpartha.lifeos.job.application.BackgroundJobEnqueueService;

/**
 * Adapts {@link BackgroundJobPort} (in {@code common.job}, visible to all domains) to the internal
 * {@link BackgroundJobEnqueueService} (in {@code job.application}, invisible to other domains).
 * Other domains inject {@link BackgroundJobPort} and never import {@code job.*} directly,
 * preserving the boundary rules of LOS-0206.
 */
@Component
class BackgroundJobPortAdapter implements BackgroundJobPort {

  private final BackgroundJobEnqueueService enqueueService;

  BackgroundJobPortAdapter(BackgroundJobEnqueueService enqueueService) {
    this.enqueueService = enqueueService;
  }

  @Override
  public UUID enqueue(UUID userId, BackgroundJobKind kind, String jsonPayload) {
    return enqueueService.enqueue(userId, kind, jsonPayload);
  }
}
