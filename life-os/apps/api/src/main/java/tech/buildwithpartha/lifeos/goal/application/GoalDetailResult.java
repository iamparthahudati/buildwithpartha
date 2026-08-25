package tech.buildwithpartha.lifeos.goal.application;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import tech.buildwithpartha.lifeos.goal.domain.Goal;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckIn;
import tech.buildwithpartha.lifeos.goal.domain.GoalLink;

/** Aggregate detail result containing Goal metadata, progress percentage, check-ins, and links. */
public record GoalDetailResult(
    Goal goal, BigDecimal progressPercentage, List<GoalCheckIn> checkIns, List<GoalLink> links) {

  public GoalDetailResult {
    Objects.requireNonNull(goal, "goal must not be null");
    Objects.requireNonNull(progressPercentage, "progressPercentage must not be null");
    Objects.requireNonNull(checkIns, "checkIns must not be null");
    Objects.requireNonNull(links, "links must not be null");
    checkIns = List.copyOf(checkIns);
    links = List.copyOf(links);
  }
}
