package tech.buildwithpartha.lifeos.goal.application;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.goal.GoalOwnershipValidator;
import tech.buildwithpartha.lifeos.goal.domain.GoalRepository;

/** Goal-owned implementation of the domain-neutral assignment validation contract. */
@Service
public class DefaultGoalOwnershipValidator implements GoalOwnershipValidator {

  private final GoalRepository goalRepository;

  public DefaultGoalOwnershipValidator(GoalRepository goalRepository) {
    this.goalRepository = goalRepository;
  }

  @Override
  public void validateAssignment(UUID userId, UUID goalId) {
    goalRepository
        .findByIdAndUserId(goalId, userId)
        .orElseThrow(
            () ->
                new FieldValidationException(
                    "Validation failed", List.of(new FieldProblem("goalId", "INVALID_GOAL"))));
  }
}
