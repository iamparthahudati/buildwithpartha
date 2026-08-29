package tech.buildwithpartha.lifeos.audit.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.activity.ActivityObjectReference;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;

/** Current linkable Activity object; absent from an event after object deletion. */
public record ActivityObjectResponse(
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ActivitySubjectType type,
    @Schema(format = "uuid", requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String label,
    @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String href) {

  static ActivityObjectResponse fromApplication(ActivityObjectReference object) {
    return new ActivityObjectResponse(object.type(), object.id(), object.label(), object.href());
  }
}
