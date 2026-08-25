package tech.buildwithpartha.lifeos.goal.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.goal.domain.Goal;
import tech.buildwithpartha.lifeos.goal.domain.GoalCheckIn;
import tech.buildwithpartha.lifeos.goal.domain.GoalDomainFixture;
import tech.buildwithpartha.lifeos.goal.domain.GoalLink;
import tech.buildwithpartha.lifeos.goal.domain.GoalLinkTargetType;
import tech.buildwithpartha.lifeos.goal.domain.GoalQuery;
import tech.buildwithpartha.lifeos.goal.domain.GoalQueryResult;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;
import tech.buildwithpartha.lifeos.goal.domain.GoalSummaryCounts;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaGoalRepositoryTests {

  @Autowired private GoalJpaRepository goalJpaRepository;
  @Autowired private GoalCheckInJpaRepository goalCheckInJpaRepository;
  @Autowired private GoalLinkJpaRepository goalLinkJpaRepository;
  @Autowired private EntityManager entityManager;

  @Test
  @DisplayName("Saved Goal round-trips correctly through JpaGoalRepository")
  void roundTripsGoal() {
    JpaGoalRepository goalRepository = new JpaGoalRepository(goalJpaRepository, entityManager);
    Goal goal = GoalDomainFixture.samplePercentageGoal();

    Goal saved = goalRepository.save(goal);
    assertThat(saved.id()).isEqualTo(goal.id());
    assertThat(saved.title()).isEqualTo(goal.title());

    Optional<Goal> found = goalRepository.findById(goal.id());
    assertThat(found).isPresent();
    assertThat(found.get().userId()).isEqualTo(goal.userId());

    Optional<Goal> foundByUser = goalRepository.findByIdAndUserId(goal.id(), goal.userId());
    assertThat(foundByUser).isPresent();

    List<Goal> userGoals = goalRepository.findByUserId(goal.userId());
    assertThat(userGoals).hasSize(1);

    List<Goal> activeGoals = goalRepository.findByUserIdAndStatus(goal.userId(), GoalStatus.ACTIVE);
    assertThat(activeGoals).hasSize(1);

    List<Goal> learningGoals = goalRepository.findByUserIdAndCategory(goal.userId(), "LEARNING");
    assertThat(learningGoals).hasSize(1);

    GoalQueryResult queryResult =
        goalRepository.queryGoals(
            new GoalQuery(
                goal.userId(),
                "Read",
                java.util.Set.of(GoalStatus.ACTIVE),
                "LEARNING",
                java.util.Set.of(
                    tech.buildwithpartha.lifeos.goal.domain.GoalProgressType.PERCENTAGE),
                false,
                0,
                20,
                "title",
                "ASC"));
    assertThat(queryResult.totalItems()).isEqualTo(1);

    GoalSummaryCounts summary = goalRepository.getSummaryCounts(goal.userId());
    assertThat(summary.totalGoals()).isEqualTo(1);
    assertThat(summary.activeGoals()).isEqualTo(1);

    goalRepository.delete(goal);
    assertThat(goalRepository.findById(goal.id())).isEmpty();
  }

  @Test
  @DisplayName("Saved GoalCheckIn round-trips correctly through JpaGoalCheckInRepository")
  void roundTripsGoalCheckIn() {
    JpaGoalRepository goalRepository = new JpaGoalRepository(goalJpaRepository, entityManager);
    JpaGoalCheckInRepository checkInRepository =
        new JpaGoalCheckInRepository(goalCheckInJpaRepository);

    Goal goal = goalRepository.save(GoalDomainFixture.samplePercentageGoal());
    GoalCheckIn checkIn = GoalDomainFixture.sampleCheckIn(goal.id());

    GoalCheckIn saved = checkInRepository.save(checkIn);
    assertThat(saved.id()).isEqualTo(checkIn.id());

    Optional<GoalCheckIn> found = checkInRepository.findById(checkIn.id());
    assertThat(found).isPresent();

    List<GoalCheckIn> checkIns = checkInRepository.findByGoalId(goal.id());
    assertThat(checkIns).hasSize(1);

    checkInRepository.deleteById(checkIn.id());
    assertThat(checkInRepository.findById(checkIn.id())).isEmpty();
  }

  @Test
  @DisplayName("Saved GoalLink round-trips correctly through JpaGoalLinkRepository")
  void roundTripsGoalLink() {
    JpaGoalRepository goalRepository = new JpaGoalRepository(goalJpaRepository, entityManager);
    JpaGoalLinkRepository linkRepository = new JpaGoalLinkRepository(goalLinkJpaRepository);

    Goal goal = goalRepository.save(GoalDomainFixture.samplePercentageGoal());
    GoalLink link = GoalDomainFixture.sampleGoalLink(goal.id());

    GoalLink saved = linkRepository.save(link);
    assertThat(saved.id()).isEqualTo(link.id());

    Optional<GoalLink> found = linkRepository.findById(link.id());
    assertThat(found).isPresent();

    Optional<GoalLink> foundTarget =
        linkRepository.findByGoalIdAndTargetTypeAndTargetId(
            goal.id(), GoalLinkTargetType.PROJECT, GoalDomainFixture.TARGET_ID);
    assertThat(foundTarget).isPresent();

    linkRepository.deleteById(link.id());
    assertThat(linkRepository.findById(link.id())).isEmpty();
  }
}
