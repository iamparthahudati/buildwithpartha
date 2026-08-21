package tech.buildwithpartha.lifeos.label.api;

import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.label.domain.Label;

public record LabelResponse(
    UUID id,
    UUID userId,
    String name,
    String nameNormalized,
    String color,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public static LabelResponse fromDomain(Label label) {
    return new LabelResponse(
        label.id(),
        label.userId(),
        label.name(),
        label.nameNormalized(),
        label.color(),
        label.createdAt(),
        label.updatedAt(),
        label.version());
  }
}
