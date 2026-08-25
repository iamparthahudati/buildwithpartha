package tech.buildwithpartha.lifeos.goal.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityCommand;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityPort;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;
import tech.buildwithpartha.lifeos.common.project.ProjectOwnershipValidator;
import tech.buildwithpartha.lifeos.common.task.TaskOwnershipValidator;
import tech.buildwithpartha.lifeos.goal.domain.CheckInCadence;
import tech.buildwithpartha.lifeos.goal.domain.Goal;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckIn;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckInRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalDomainFixture;
import tech.buildwithpartha.lifeos.goal.domain.GoalLink;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkTargetType;
import tech.buildwithpartha.lifeos.goal.domain.GoalProgressType;
import tech.buildwithpartha.lifeos.goal.domain.GoalRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;

@DisplayName("GoalService unit tests")
class GoalServiceTests {

  private GoalRepository goalRepository;
  private GoalCheckInRepository goalCheckInRepository;
  private GoalLinkRepository goalLinkRepository;
  private ProductActivityPort activityPort;
  private ProjectOwnershipValidator projectValidator;
  private TaskOwnershipValidator taskValidator;
  private Clock clock;
  private GoalService service;

  private final Instant FIXED_NOW = Instant.parse("2026-08-25T10:00:00Z");

  @BeforeEach
  void setUp() {
    goalRepository = mock(GoalRepository.class);
    goalCheckInRepository = mock(GoalCheckInRepository.class);
    goalLinkRepository = mock(GoalLinkRepository.class);
    activityPort = mock(ProductActivityPort.class);
    projectValidator = mock(ProjectOwnershipValidator.class);
    taskValidator = mock(TaskOwnershipValidator.class);
    clock = Clock.fixed(FIXED_NOW, ZoneId.of("UTC"));

    service =
        new GoalService(
            goalRepository,
            goalCheckInRepository,
            goalLinkRepository,
            activityPort,
            projectValidator,
            taskValidator,
            clock);
  }

  @Nested
  @DisplayName("Create, Read, Update, Delete Goal")
  class GoalCrudTests {

    @Test
    @DisplayName("createGoal creates goal and logs activity")
    void createGoalSuccess() {
      CreateGoalCommand cmd =
          new CreateGoalCommand(
              "Read 24 books",
              Optional.of("Reading goal"),
              "PERSONAL",
              GoalProgressType.NUMERIC,
              Optional.of(BigDecimal.valueOf(24)),
              BigDecimal.ZERO,
              Optional.of("books"),
              Optional.of(LocalDate.of(2026, 12, 31)),
              GoalStatus.ACTIVE,
              CheckInCadence.MONTHLY);

      when(goalRepository.save(any(Goal.class))).thenAnswer(i -> i.getArgument(0));

      Goal created = service.createGoal(GoalDomainFixture.USER_ID, cmd);

      assertThat(created.title()).isEqualTo("Read 24 books");
      assertThat(created.status()).isEqualTo(GoalStatus.ACTIVE);
      verify(activityPort).record(any(ProductActivityCommand.class));
    }

    @Test
    @DisplayName("getGoal returns goal for owner, throws 404 for non-owner or missing")
    void getGoalBehavior() {
      Goal goal = GoalDomainFixture.samplePercentageGoal();
      when(goalRepository.findByIdAndUserId(goal.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(goal));

      Goal result = service.getGoal(GoalDomainFixture.USER_ID, goal.id());
      assertThat(result.id()).isEqualTo(goal.id());

      when(goalRepository.findByIdAndUserId(goal.id(), GoalDomainFixture.OTHER_USER_ID))
          .thenReturn(Optional.empty());

      assertThatThrownBy(() -> service.getGoal(GoalDomainFixture.OTHER_USER_ID, goal.id()))
          .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("updateGoal updates fields and increments version")
    void updateGoalSuccess() {
      Goal existing = GoalDomainFixture.samplePercentageGoal();
      when(goalRepository.findByIdAndUserId(existing.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(existing));
      when(goalRepository.save(any(Goal.class)))
          .thenAnswer(
              i -> {
                Goal g = i.getArgument(0);
                return new Goal(
                    g.id(),
                    g.userId(),
                    g.title(),
                    g.description(),
                    g.category(),
                    g.progressType(),
                    g.targetValue(),
                    g.currentValue(),
                    g.unit(),
                    g.targetDate(),
                    g.status(),
                    g.checkInCadence(),
                    g.archived(),
                    g.createdAt(),
                    g.updatedAt(),
                    g.version() + 1);
              });

      UpdateGoalCommand cmd =
          new UpdateGoalCommand(
              "Read 30 books",
              Optional.of("Updated description"),
              "PERSONAL",
              GoalProgressType.PERCENTAGE,
              Optional.of(BigDecimal.valueOf(100)),
              BigDecimal.valueOf(60),
              Optional.of("%"),
              Optional.of(LocalDate.of(2026, 12, 31)),
              CheckInCadence.WEEKLY,
              existing.version());

      Goal updated = service.updateGoal(GoalDomainFixture.USER_ID, existing.id(), cmd);

      assertThat(updated.title()).isEqualTo("Read 30 books");
      assertThat(updated.version()).isEqualTo(existing.version() + 1);
    }

    @Test
    @DisplayName("updateGoal throws ConcurrencyConflictException when version mismatch")
    void updateGoalVersionConflict() {
      Goal existing = GoalDomainFixture.samplePercentageGoal();
      when(goalRepository.findByIdAndUserId(existing.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(existing));

      UpdateGoalCommand cmd =
          new UpdateGoalCommand(
              "Read 30 books",
              Optional.empty(),
              "PERSONAL",
              GoalProgressType.PERCENTAGE,
              Optional.of(BigDecimal.valueOf(100)),
              BigDecimal.valueOf(60),
              Optional.empty(),
              Optional.empty(),
              CheckInCadence.NONE,
              999L);

      assertThatThrownBy(() -> service.updateGoal(GoalDomainFixture.USER_ID, existing.id(), cmd))
          .isInstanceOf(ConcurrencyConflictException.class);
    }

    @Test
    @DisplayName("deleteGoal deletes goal, check-ins, links, and records activity")
    void deleteGoalSuccess() {
      Goal goal = GoalDomainFixture.samplePercentageGoal();
      when(goalRepository.findByIdAndUserId(goal.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(goal));

      service.deleteGoal(GoalDomainFixture.USER_ID, goal.id());

      verify(goalRepository).delete(goal);
      verify(activityPort).record(any(ProductActivityCommand.class));
    }
  }

  @Nested
  @DisplayName("Lifecycle Transitions: Pause, Complete, Archive, Restore")
  class LifecycleTests {

    @Test
    @DisplayName("pauseGoal updates status to PAUSED and records activity")
    void pauseGoalSuccess() {
      Goal existing = GoalDomainFixture.samplePercentageGoal();
      when(goalRepository.findByIdAndUserId(existing.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(existing));
      when(goalRepository.save(any(Goal.class))).thenAnswer(i -> i.getArgument(0));

      Goal paused = service.pauseGoal(GoalDomainFixture.USER_ID, existing.id(), existing.version());

      assertThat(paused.status()).isEqualTo(GoalStatus.PAUSED);
      verify(activityPort).record(any(ProductActivityCommand.class));
    }

    @Test
    @DisplayName("completeGoal updates status to COMPLETED and records activity")
    void completeGoalSuccess() {
      Goal existing = GoalDomainFixture.samplePercentageGoal();
      when(goalRepository.findByIdAndUserId(existing.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(existing));
      when(goalRepository.save(any(Goal.class))).thenAnswer(i -> i.getArgument(0));

      Goal completed =
          service.completeGoal(GoalDomainFixture.USER_ID, existing.id(), existing.version());

      assertThat(completed.status()).isEqualTo(GoalStatus.COMPLETED);
      verify(activityPort).record(any(ProductActivityCommand.class));
    }

    @Test
    @DisplayName("archiveGoal sets archived=true and records activity")
    void archiveGoalSuccess() {
      Goal existing = GoalDomainFixture.samplePercentageGoal();
      when(goalRepository.findByIdAndUserId(existing.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(existing));
      when(goalRepository.save(any(Goal.class))).thenAnswer(i -> i.getArgument(0));

      Goal archived =
          service.archiveGoal(GoalDomainFixture.USER_ID, existing.id(), existing.version());

      assertThat(archived.archived()).isTrue();
      verify(activityPort).record(any(ProductActivityCommand.class));
    }

    @Test
    @DisplayName("restoreGoal sets archived=false and records activity")
    void restoreGoalSuccess() {
      Goal existing = GoalDomainFixture.samplePercentageGoal();
      Goal archivedGoal =
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
              existing.updatedAt(),
              existing.version());

      when(goalRepository.findByIdAndUserId(existing.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(archivedGoal));
      when(goalRepository.save(any(Goal.class))).thenAnswer(i -> i.getArgument(0));

      Goal restored =
          service.restoreGoal(GoalDomainFixture.USER_ID, existing.id(), existing.version());

      assertThat(restored.archived()).isFalse();
      verify(activityPort).record(any(ProductActivityCommand.class));
    }

    @Test
    @DisplayName("Lifecycle idempotent transitions return existing goal without activity duplicate")
    void idempotentLifecycleTransitions() {
      Goal existing = GoalDomainFixture.samplePercentageGoal();
      Goal pausedGoal =
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
              false,
              existing.createdAt(),
              existing.updatedAt(),
              existing.version());

      when(goalRepository.findByIdAndUserId(existing.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(pausedGoal));

      Goal result = service.pauseGoal(GoalDomainFixture.USER_ID, existing.id(), existing.version());
      assertThat(result.status()).isEqualTo(GoalStatus.PAUSED);

      Goal completedGoal =
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
              false,
              existing.createdAt(),
              existing.updatedAt(),
              existing.version());

      when(goalRepository.findByIdAndUserId(existing.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(completedGoal));

      Goal completedResult =
          service.completeGoal(GoalDomainFixture.USER_ID, existing.id(), existing.version());
      assertThat(completedResult.status()).isEqualTo(GoalStatus.COMPLETED);

      Goal archivedGoal =
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
              existing.updatedAt(),
              existing.version());

      when(goalRepository.findByIdAndUserId(existing.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(archivedGoal));

      Goal archivedResult =
          service.archiveGoal(GoalDomainFixture.USER_ID, existing.id(), existing.version());
      assertThat(archivedResult.archived()).isTrue();

      when(goalRepository.findByIdAndUserId(existing.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(existing));

      Goal unarchivedResult =
          service.restoreGoal(GoalDomainFixture.USER_ID, existing.id(), existing.version());
      assertThat(unarchivedResult.archived()).isFalse();
    }
  }

  @Nested
  @DisplayName("Check-ins and Linking")
  class CheckInsAndLinkingTests {

    @Test
    @DisplayName("addCheckIn saves check-in, updates goal currentValue, and logs activity")
    void addCheckInSuccess() {
      Goal goal = GoalDomainFixture.sampleNumericGoal();
      when(goalRepository.findByIdAndUserId(goal.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(goal));
      when(goalCheckInRepository.save(any(GoalCheckIn.class))).thenAnswer(i -> i.getArgument(0));
      when(goalRepository.save(any(Goal.class))).thenAnswer(i -> i.getArgument(0));

      AddCheckInCommand cmd =
          new AddCheckInCommand(
              BigDecimal.valueOf(5000), Optional.of("Halfway there"), Optional.of(FIXED_NOW));

      GoalCheckIn checkIn = service.addCheckIn(GoalDomainFixture.USER_ID, goal.id(), cmd);

      assertThat(checkIn.value()).isEqualTo(BigDecimal.valueOf(5000));
      verify(goalRepository).save(any(Goal.class));
      verify(activityPort).record(any(ProductActivityCommand.class));
    }

    @Test
    @DisplayName("getCheckIns returns paginated check-ins")
    void getCheckInsSuccess() {
      Goal goal = GoalDomainFixture.samplePercentageGoal();
      GoalCheckIn checkIn = GoalDomainFixture.sampleCheckIn(goal.id());
      when(goalRepository.findByIdAndUserId(goal.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(goal));
      when(goalCheckInRepository.findByGoalIdAndUserId(goal.id(), GoalDomainFixture.USER_ID, 0, 20))
          .thenReturn(List.of(checkIn));
      when(goalCheckInRepository.countByGoalIdAndUserId(goal.id(), GoalDomainFixture.USER_ID))
          .thenReturn(1L);

      PageResponse<GoalCheckIn> page =
          service.getCheckIns(GoalDomainFixture.USER_ID, goal.id(), 0, 20);
      assertThat(page.items()).hasSize(1);
      assertThat(page.totalItems()).isEqualTo(1);
    }

    @Test
    @DisplayName("deleteCheckIn throws exception if checkIn belongs to another goal")
    void deleteCheckInWrongGoal() {
      Goal goal = GoalDomainFixture.samplePercentageGoal();
      UUID otherGoalId = UUID.randomUUID();
      GoalCheckIn checkIn = GoalDomainFixture.sampleCheckIn(otherGoalId);

      when(goalRepository.findByIdAndUserId(goal.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(goal));
      when(goalCheckInRepository.findByIdAndUserId(checkIn.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(checkIn));

      assertThatThrownBy(
              () -> service.deleteCheckIn(GoalDomainFixture.USER_ID, goal.id(), checkIn.id()))
          .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("addLink validates TASK and HABIT targets and returns existing link for duplicate")
    void addLinkTargetTypes() {
      Goal goal = GoalDomainFixture.samplePercentageGoal();
      when(goalRepository.findByIdAndUserId(goal.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(goal));
      when(goalLinkRepository.save(any(GoalLink.class))).thenAnswer(i -> i.getArgument(0));

      // Task target
      AddGoalLinkCommand taskCmd =
          new AddGoalLinkCommand(GoalLinkTargetType.TASK, GoalDomainFixture.TARGET_ID);
      GoalLink taskLink = service.addLink(GoalDomainFixture.USER_ID, goal.id(), taskCmd);
      assertThat(taskLink.targetType()).isEqualTo(GoalLinkTargetType.TASK);
      verify(taskValidator)
          .validateAssignment(GoalDomainFixture.USER_ID, GoalDomainFixture.TARGET_ID);

      // Habit target
      AddGoalLinkCommand habitCmd =
          new AddGoalLinkCommand(GoalLinkTargetType.HABIT, GoalDomainFixture.TARGET_ID);
      GoalLink habitLink = service.addLink(GoalDomainFixture.USER_ID, goal.id(), habitCmd);
      assertThat(habitLink.targetType()).isEqualTo(GoalLinkTargetType.HABIT);

      // Duplicate link returns existing link idempotently
      GoalLink existingLink = GoalDomainFixture.sampleGoalLink(goal.id());
      when(goalLinkRepository.findByGoalIdAndTargetTypeAndTargetId(
              goal.id(), GoalLinkTargetType.PROJECT, GoalDomainFixture.TARGET_ID))
          .thenReturn(Optional.of(existingLink));

      AddGoalLinkCommand projectCmd =
          new AddGoalLinkCommand(GoalLinkTargetType.PROJECT, GoalDomainFixture.TARGET_ID);
      GoalLink dupLink = service.addLink(GoalDomainFixture.USER_ID, goal.id(), projectCmd);
      assertThat(dupLink).isEqualTo(existingLink);
    }

    @Test
    @DisplayName("deleteLink throws exception if link belongs to another goal")
    void deleteLinkWrongGoal() {
      Goal goal = GoalDomainFixture.samplePercentageGoal();
      UUID otherGoalId = UUID.randomUUID();
      GoalLink link =
          new GoalLink(
              UUID.randomUUID(),
              otherGoalId,
              GoalDomainFixture.USER_ID,
              GoalLinkTargetType.PROJECT,
              GoalDomainFixture.TARGET_ID,
              Instant.now());

      when(goalRepository.findByIdAndUserId(goal.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(goal));
      when(goalLinkRepository.findByIdAndUserId(link.id(), GoalDomainFixture.USER_ID))
          .thenReturn(Optional.of(link));

      assertThatThrownBy(() -> service.deleteLink(GoalDomainFixture.USER_ID, goal.id(), link.id()))
          .isInstanceOf(ResourceNotFoundException.class);
    }
  }
}
