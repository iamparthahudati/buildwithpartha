package tech.buildwithpartha.lifeos.goal.application;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToGoalCommand;
import tech.buildwithpartha.lifeos.common.goal.BrainDumpGoalCreator;
import tech.buildwithpartha.lifeos.goal.domain.CheckInCadence;
import tech.buildwithpartha.lifeos.goal.domain.GoalProgressType;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;

@Service
public class BrainDumpGoalCreatorAdapter implements BrainDumpGoalCreator {

  private final GoalService goalService;

  public BrainDumpGoalCreatorAdapter(GoalService goalService) {
    this.goalService = goalService;
  }

  @Override
  public UUID createGoal(UUID userId, ConvertToGoalCommand command) {
    CreateGoalCommand serviceCommand =
        new CreateGoalCommand(
            command.title(),
            command.description(),
            command.category(),
            GoalProgressType.valueOf(command.progressType().toUpperCase()),
            command.targetValue(),
            BigDecimal.ZERO, // currentValue
            Optional.of(""), // unit
            command.targetDate(),
            GoalStatus.NOT_STARTED,
            CheckInCadence.valueOf(command.checkInCadence().toUpperCase()));
    return goalService.createGoal(userId, serviceCommand).id();
  }
}
