package tech.buildwithpartha.lifeos.goal.api;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import tech.buildwithpartha.lifeos.goal.application.GoalDetailResult;

/** Detailed aggregate response for a Goal, including recent check-ins and linked entities. */
public record GoalDetailResponse(
    GoalResponse goal,
    BigDecimal progressPercentage,
    List<GoalCheckInResponse> checkIns,
    List<GoalLinkResponse> links) {

  public static GoalDetailResponse fromApplication(GoalDetailResult result) {
    Objects.requireNonNull(result, "result must not be null");
    List<GoalCheckInResponse> checkIns =
        result.checkIns().stream().map(GoalCheckInResponse::fromDomain).toList();
    List<GoalLinkResponse> links =
        result.links().stream().map(GoalLinkResponse::fromDomain).toList();
    return new GoalDetailResponse(
        GoalResponse.fromDomain(result.goal()), result.progressPercentage(), checkIns, links);
  }
}
