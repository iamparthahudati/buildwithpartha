package tech.buildwithpartha.lifeos.label.application;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.label.domain.Label;
import tech.buildwithpartha.lifeos.label.domain.LabelRepository;

@Service
@Transactional
public class LabelService {

  private final LabelRepository labelRepository;

  public LabelService(LabelRepository labelRepository) {
    this.labelRepository = labelRepository;
  }

  public Label createLabel(UUID userId, CreateLabelCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    String rawName = command.name() != null ? command.name().trim() : "";
    if (rawName.isBlank()) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("name", "BLANK")));
    }

    String color = command.color();
    if (color != null && !color.isBlank() && color.length() > 30) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("color", "INVALID_COLOR_FORMAT")));
    }

    String normalizedName = Label.normalizeName(rawName);
    if (labelRepository.findByUserIdAndNameNormalized(userId, normalizedName).isPresent()) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("name", "DUPLICATE_LABEL_NAME")));
    }

    Instant now = Instant.now();
    Label label =
        new Label(
            UUID.randomUUID(),
            userId,
            rawName,
            normalizedName,
            color != null && !color.isBlank() ? color : null,
            now,
            now,
            0L);

    return labelRepository.save(label);
  }

  @Transactional(readOnly = true)
  public List<Label> getLabels(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return labelRepository.findByUserId(userId);
  }

  @Transactional(readOnly = true)
  public Label getLabelById(UUID userId, UUID labelId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(labelId, "labelId must not be null");

    Label label =
        labelRepository
            .findById(labelId)
            .orElseThrow(() -> new ResourceNotFoundException("Label not found: " + labelId));

    if (!label.userId().equals(userId)) {
      throw new ResourceNotFoundException("Label not found: " + labelId);
    }

    return label;
  }

  public Label updateLabel(UUID userId, UUID labelId, UpdateLabelCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(labelId, "labelId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    Label existing = getLabelById(userId, labelId);

    if (existing.version() != command.version()) {
      throw new ConcurrencyConflictException(
          "Label version mismatch. Expected "
              + existing.version()
              + " but got "
              + command.version());
    }

    String rawName = command.name() != null ? command.name().trim() : "";
    if (rawName.isBlank()) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("name", "BLANK")));
    }

    String color = command.color();
    if (color != null && !color.isBlank() && color.length() > 30) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("color", "INVALID_COLOR_FORMAT")));
    }

    String normalizedName = Label.normalizeName(rawName);
    if (!normalizedName.equals(existing.nameNormalized())) {
      Optional<Label> duplicate =
          labelRepository.findByUserIdAndNameNormalized(userId, normalizedName);
      if (duplicate.isPresent()) {
        throw new FieldValidationException(
            "Validation failed", List.of(new FieldProblem("name", "DUPLICATE_LABEL_NAME")));
      }
    }

    Instant now = Instant.now();
    Label updated =
        new Label(
            existing.id(),
            userId,
            rawName,
            normalizedName,
            color != null && !color.isBlank() ? color : null,
            existing.createdAt(),
            now,
            existing.version());

    return labelRepository.save(updated);
  }

  public void deleteLabel(UUID userId, UUID labelId, Optional<UUID> replaceWithLabelId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(labelId, "labelId must not be null");
    Objects.requireNonNull(replaceWithLabelId, "replaceWithLabelId must not be null");

    Label existing = getLabelById(userId, labelId);

    if (replaceWithLabelId.isPresent()) {
      UUID replacementId = replaceWithLabelId.get();
      if (replacementId.equals(labelId)) {
        throw new FieldValidationException(
            "Validation failed",
            List.of(new FieldProblem("replaceWithLabelId", "CANNOT_REPLACE_WITH_SELF")));
      }
      // Validate replacement label exists and belongs to user
      getLabelById(userId, replacementId);

      labelRepository.deleteWithReplacement(userId, labelId, replacementId);
    } else {
      labelRepository.delete(existing);
    }
  }
}
