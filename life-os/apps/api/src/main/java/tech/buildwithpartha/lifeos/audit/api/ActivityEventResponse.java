package tech.buildwithpartha.lifeos.audit.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.audit.application.ActivityReadItem;
import tech.buildwithpartha.lifeos.common.activity.ActivityEventType;

/** Structured, content-minimized Activity Event API projection. */
public record ActivityEventResponse(
    @Schema(format = "uuid", requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
    @Schema(format = "uuid", requiredMode = Schema.RequiredMode.REQUIRED) UUID actorUserId,
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ActivityEventType eventType,
    @Schema(
            nullable = true,
            description =
                "Current owner-scoped object link; null after deletion or unavailability.")
        ActivityObjectResponse object,
    @Schema(format = "date-time", requiredMode = Schema.RequiredMode.REQUIRED) Instant occurredAt) {

  static ActivityEventResponse fromApplication(ActivityReadItem item) {
    return new ActivityEventResponse(
        item.id(),
        item.actorUserId(),
        item.eventType(),
        item.object().map(ActivityObjectResponse::fromApplication).orElse(null),
        item.occurredAt());
  }
}
