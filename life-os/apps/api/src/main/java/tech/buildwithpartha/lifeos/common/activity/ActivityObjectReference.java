package tech.buildwithpartha.lifeos.common.activity;

import java.util.Objects;
import java.util.UUID;

/** Current owner-scoped link target for an Activity Event object. */
public record ActivityObjectReference(
    ActivitySubjectType type, UUID id, String label, String href) {

  public ActivityObjectReference {
    Objects.requireNonNull(type, "type must not be null");
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(label, "label must not be null");
    Objects.requireNonNull(href, "href must not be null");
    if (label.isBlank()) {
      throw new IllegalArgumentException("label must not be blank");
    }
    if (href.isBlank()) {
      throw new IllegalArgumentException("href must not be blank");
    }
  }
}
