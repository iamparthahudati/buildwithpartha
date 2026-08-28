package tech.buildwithpartha.lifeos.goal.application;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.activity.ActivityEventType;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityCommand;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityPort;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;
import tech.buildwithpartha.lifeos.common.project.ProjectOwnershipValidator;
import tech.buildwithpartha.lifeos.common.task.TaskOwnershipValidator;
import tech.buildwithpartha.lifeos.goal.domain.Goal;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckIn;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckInRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalLink;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkTargetType;
import tech.buildwithpartha.lifeos.goal.domain.GoalQuery;
import tech.buildwithpartha.lifeos.goal.domain.GoalQueryResult;
import tech.buildwithpartha.lifeos.goal.domain.GoalRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;
import tech.buildwithpartha.lifeos.goal.domain.GoalSummaryCounts;

/** Transactional application service managing Goal lifecycle, check-ins, and links. */
@Service
public class GoalService {

  private final GoalRepository goalRepository;
  private final GoalCheckInRepository goalCheckInRepository;
  private final GoalLinkRepository goalLinkRepository;
  private final ProductActivityPort activityPort;
  private final ProjectOwnershipValidator projectOwnershipValidator;
  private final TaskOwnershipValidator taskOwnershipValidator;
  private final Clock clock;

  public GoalService(
      GoalRepository goalRepository,
      GoalCheckInRepository goalCheckInRepository,
      GoalLinkRepository goalLinkRepository,
      ProductActivityPort activityPort,
      ProjectOwnershipValidator projectOwnershipValidator,
      TaskOwnershipValidator taskOwnershipValidator,
      Clock clock) {
    this.goalRepository = Objects.requireNonNull(goalRepository, "goalRepository must not be null");
    this.goalCheckInRepository =
        Objects.requireNonNull(goalCheckInRepository, "goalCheckInRepository must not be null");
    this.goalLinkRepository =
        Objects.requireNonNull(goalLinkRepository, "goalLinkRepository must not be null");
    this.activityPort = Objects.requireNonNull(activityPort, "activityPort must not be null");
    this.projectOwnershipValidator =
        Objects.requireNonNull(
            projectOwnershipValidator, "projectOwnershipValidator must not be null");
    this.taskOwnershipValidator =
        Objects.requireNonNull(taskOwnershipValidator, "taskOwnershipValidator must not be null");
    this.clock = Objects.requireNonNull(clock, "clock must not be null");
  }

  @Transactional
  public Goal createGoal(UUID userId, CreateGoalCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    Goal goal =
        new Goal(
            UUID.randomUUID(),
            userId,
            command.title(),
            command.description(),
            command.category(),
            command.progressType(),
            command.targetValue(),
            command.currentValue(),
            command.unit(),
            command.targetDate(),
            command.status(),
            command.checkInCadence(),
            false,
            clock.instant(),
            clock.instant(),
            0L);

    Goal saved = goalRepository.save(goal);
    recordActivity(userId, ActivityEventType.GOAL_CREATED, saved.id());
    return saved;
  }

  @Transactional(readOnly = true)
  public Goal getGoal(UUID userId, UUID goalId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(goalId, "goalId must not be null");
    return goalRepository
        .findByIdAndUserId(goalId, userId)
        .orElseThrow(() -> new ResourceNotFoundException("Goal not found"));
  }

  @Transactional(readOnly = true)
  public GoalDetailResult getGoalDetail(UUID userId, UUID goalId) {
    Goal goal = getGoal(userId, goalId);
    List<GoalCheckIn> checkIns = goalCheckInRepository.findByGoalIdAndUserId(goalId, userId);
    List<GoalLink> links = goalLinkRepository.findByGoalIdAndUserId(goalId, userId);
    return new GoalDetailResult(goal, goal.calculateProgressPercentage(), checkIns, links);
  }

  @Transactional(readOnly = true)
  public GoalQueryResult queryGoals(GoalQuery query) {
    Objects.requireNonNull(query, "query must not be null");
    return goalRepository.queryGoals(query);
  }

  @Transactional(readOnly = true)
  public GoalSummaryCounts getSummaryCounts(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return goalRepository.getSummaryCounts(userId);
  }

  @Transactional
  public Goal updateGoal(UUID userId, UUID goalId, UpdateGoalCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(goalId, "goalId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    Goal existing = getGoal(userId, goalId);
    if (existing.version() != command.version()) {
      throw new ConcurrencyConflictException("Goal version conflict");
    }

    Goal updated =
        new Goal(
            existing.id(),
            existing.userId(),
            command.title(),
            command.description(),
            command.category(),
            command.progressType(),
            command.targetValue(),
            command.currentValue(),
            command.unit(),
            command.targetDate(),
            existing.status(),
            command.checkInCadence(),
            existing.archived(),
            existing.createdAt(),
            clock.instant(),
            existing.version());

    Goal saved = goalRepository.save(updated);
    recordActivity(userId, ActivityEventType.GOAL_UPDATED, saved.id());
    return saved;
  }

  @Transactional
  public Goal pauseGoal(UUID userId, UUID goalId, long expectedVersion) {
    Goal existing = getGoal(userId, goalId);
    validateVersion(existing, expectedVersion);
    if (existing.status() == GoalStatus.PAUSED) {
      return existing;
    }
    Goal updated =
        new Goal(
            existing.id(),
            existing.userId(),
            existing.title(),
            existing.description(),
            existing.category(),
            existing.progressType(),
            existing.targetValue(),
            existing.currentValue(),
            existing.unit(),
            existing.targetDate(),
            GoalStatus.PAUSED,
            existing.checkInCadence(),
            existing.archived(),
            existing.createdAt(),
            clock.instant(),
            existing.version());

    Goal saved = goalRepository.save(updated);
    recordActivity(userId, ActivityEventType.GOAL_PAUSED, saved.id());
    return saved;
  }

  @Transactional
  public Goal completeGoal(UUID userId, UUID goalId, long expectedVersion) {
    Goal existing = getGoal(userId, goalId);
    validateVersion(existing, expectedVersion);
    if (existing.status() == GoalStatus.COMPLETED) {
      return existing;
    }
    Goal updated =
        new Goal(
            existing.id(),
            existing.userId(),
            existing.title(),
            existing.description(),
            existing.category(),
            existing.progressType(),
            existing.targetValue(),
            existing.currentValue(),
            existing.unit(),
            existing.targetDate(),
            GoalStatus.COMPLETED,
            existing.checkInCadence(),
            existing.archived(),
            existing.createdAt(),
            clock.instant(),
            existing.version());

    Goal saved = goalRepository.save(updated);
    recordActivity(userId, ActivityEventType.GOAL_COMPLETED, saved.id());
    return saved;
  }

  @Transactional
  public Goal archiveGoal(UUID userId, UUID goalId, long expectedVersion) {
    Goal existing = getGoal(userId, goalId);
    validateVersion(existing, expectedVersion);
    if (existing.archived()) {
      return existing;
    }
    Goal updated =
        new Goal(
            existing.id(),
            existing.userId(),
            existing.title(),
            existing.description(),
            existing.category(),
            existing.progressType(),
            existing.targetValue(),
            existing.currentValue(),
            existing.unit(),
            existing.targetDate(),
            existing.status(),
            existing.checkInCadence(),
            true,
            existing.createdAt(),
            clock.instant(),
            existing.version());

    Goal saved = goalRepository.save(updated);
    recordActivity(userId, ActivityEventType.GOAL_ARCHIVED, saved.id());
    return saved;
  }

  @Transactional
  public Goal restoreGoal(UUID userId, UUID goalId, long expectedVersion) {
    Goal existing = getGoal(userId, goalId);
    validateVersion(existing, expectedVersion);
    if (!existing.archived()) {
      return existing;
    }
    Goal updated =
        new Goal(
            existing.id(),
            existing.userId(),
            existing.title(),
            existing.description(),
            existing.category(),
            existing.progressType(),
            existing.targetValue(),
            existing.currentValue(),
            existing.unit(),
            existing.targetDate(),
            existing.status(),
            existing.checkInCadence(),
            false,
            existing.createdAt(),
            clock.instant(),
            existing.version());

    Goal saved = goalRepository.save(updated);
    recordActivity(userId, ActivityEventType.GOAL_RESTORED, saved.id());
    return saved;
  }

  @Transactional
  public void deleteGoal(UUID userId, UUID goalId) {
    Goal existing = getGoal(userId, goalId);
    List<GoalCheckIn> checkIns = goalCheckInRepository.findByGoalIdAndUserId(goalId, userId);
    checkIns.forEach(goalCheckInRepository::delete);
    List<GoalLink> links = goalLinkRepository.findByGoalIdAndUserId(goalId, userId);
    links.forEach(goalLinkRepository::delete);

    goalRepository.delete(existing);
    recordActivity(userId, ActivityEventType.GOAL_DELETED, goalId);
  }

  @Transactional
  public GoalCheckIn addCheckIn(UUID userId, UUID goalId, AddCheckInCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(goalId, "goalId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    Goal goal = getGoal(userId, goalId);
    Instant recordedAt = command.recordedAt().orElseGet(clock::instant);

    GoalCheckIn checkIn =
        new GoalCheckIn(
            UUID.randomUUID(),
            goalId,
            userId,
            command.value(),
            command.note(),
            recordedAt,
            clock.instant());
    GoalCheckIn savedCheckIn = goalCheckInRepository.save(checkIn);

    // Update goal current value and bump version
    Goal updatedGoal =
        new Goal(
            goal.id(),
            goal.userId(),
            goal.title(),
            goal.description(),
            goal.category(),
            goal.progressType(),
            goal.targetValue(),
            command.value(),
            goal.unit(),
            goal.targetDate(),
            goal.status(),
            goal.checkInCadence(),
            goal.archived(),
            goal.createdAt(),
            clock.instant(),
            goal.version());
    goalRepository.save(updatedGoal);

    recordActivity(userId, ActivityEventType.GOAL_CHECK_IN_ADDED, goalId);
    return savedCheckIn;
  }

  @Transactional(readOnly = true)
  public PageResponse<GoalCheckIn> getCheckIns(UUID userId, UUID goalId, int page, int size) {
    getGoal(userId, goalId);
    List<GoalCheckIn> items =
        goalCheckInRepository.findByGoalIdAndUserId(goalId, userId, page, size);
    long total = goalCheckInRepository.countByGoalIdAndUserId(goalId, userId);
    return PageResponse.of(items, page, size, total);
  }

  @Transactional
  public void deleteCheckIn(UUID userId, UUID goalId, UUID checkInId) {
    getGoal(userId, goalId);
    GoalCheckIn checkIn =
        goalCheckInRepository
            .findByIdAndUserId(checkInId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Check-in not found"));
    if (!checkIn.goalId().equals(goalId)) {
      throw new ResourceNotFoundException("Check-in not found for goal");
    }
    goalCheckInRepository.delete(checkIn);
  }

  @Transactional
  public GoalLink addLink(UUID userId, UUID goalId, AddGoalLinkCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(goalId, "goalId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    Goal goal = getGoal(userId, goalId);
    validateTarget(userId, command.targetType(), command.targetId());

    Optional<GoalLink> existingLink =
        goalLinkRepository.findByGoalIdAndTargetTypeAndTargetId(
            goalId, command.targetType(), command.targetId());
    if (existingLink.isPresent()) {
      return existingLink.get();
    }

    GoalLink link =
        new GoalLink(
            UUID.randomUUID(),
            goalId,
            userId,
            command.targetType(),
            command.targetId(),
            clock.instant());
    GoalLink saved = goalLinkRepository.save(link);
    recordActivity(userId, ActivityEventType.GOAL_LINK_ADDED, goalId);
    return saved;
  }

  @Transactional(readOnly = true)
  public List<GoalLink> getLinks(UUID userId, UUID goalId) {
    getGoal(userId, goalId);
    return goalLinkRepository.findByGoalIdAndUserId(goalId, userId);
  }

  @Transactional
  public void deleteLink(UUID userId, UUID goalId, UUID linkId) {
    getGoal(userId, goalId);
    GoalLink link =
        goalLinkRepository
            .findByIdAndUserId(linkId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Link not found"));
    if (!link.goalId().equals(goalId)) {
      throw new ResourceNotFoundException("Link not found for goal");
    }
    goalLinkRepository.delete(link);
    recordActivity(userId, ActivityEventType.GOAL_LINK_REMOVED, goalId);
  }

  private void validateTarget(UUID userId, GoalLinkTargetType targetType, UUID targetId) {
    switch (targetType) {
      case PROJECT -> {
        try {
          projectOwnershipValidator.validateAssignment(userId, targetId);
        } catch (Exception e) {
          throw new ResourceNotFoundException("Target project not found");
        }
      }
      case TASK -> {
        try {
          taskOwnershipValidator.validateAssignment(userId, targetId);
        } catch (Exception e) {
          throw new ResourceNotFoundException("Target task not found");
        }
      }
      case HABIT -> {
        Objects.requireNonNull(targetId, "targetId must not be null");
      }
    }
  }

  private static void validateVersion(Goal existing, long expectedVersion) {
    if (existing.version() != expectedVersion) {
      throw new ConcurrencyConflictException("Goal version conflict");
    }
  }

  private void recordActivity(UUID userId, ActivityEventType eventType, UUID subjectId) {
    activityPort.record(
        new ProductActivityCommand(userId, userId, eventType, ActivitySubjectType.GOAL, subjectId));
  }
}
