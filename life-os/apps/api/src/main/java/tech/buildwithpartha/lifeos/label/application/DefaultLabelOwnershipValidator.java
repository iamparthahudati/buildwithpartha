package tech.buildwithpartha.lifeos.label.application;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.label.LabelOwnershipValidator;
import tech.buildwithpartha.lifeos.label.domain.Label;
import tech.buildwithpartha.lifeos.label.domain.LabelRepository;

/**
 * Default implementation of {@link LabelOwnershipValidator} verifying labels against the database.
 */
@Service
public class DefaultLabelOwnershipValidator implements LabelOwnershipValidator {

  private final LabelRepository labelRepository;

  public DefaultLabelOwnershipValidator(LabelRepository labelRepository) {
    this.labelRepository = labelRepository;
  }

  @Override
  public void validateOwnership(UUID userId, Collection<UUID> labelIds) {
    if (labelIds == null || labelIds.isEmpty()) {
      return;
    }

    List<UUID> userLabelIds = labelRepository.findByUserId(userId).stream().map(Label::id).toList();

    for (UUID labelId : labelIds) {
      if (!userLabelIds.contains(labelId)) {
        throw new FieldValidationException(
            "Validation failed", List.of(new FieldProblem("labelIds", "INVALID_LABEL")));
      }
    }
  }
}
