package tech.buildwithpartha.lifeos.project.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ProjectProgressCalculatorTests {

  private static final UUID USER_ID = UUID.randomUUID();
  private static final Instant TEST_NOW = Instant.parse("2026-08-20T12:00:00Z");

  @Test
  void zeroTasksActiveProjectHasZeroProgressAndNotSetHealth() {
    Project project = createProject(ProjectStatus.ACTIVE, ProjectHealth.NOT_SET);
    List<ProjectTask> tasks = List.of();

    ProjectProgress result =
        ProjectProgressCalculator.calculate(project, tasks, ProgressPolicy.COUNT, TEST_NOW);

    assertThat(result.percentage()).isZero();
    assertThat(result.health()).isEqualTo(ProjectHealth.NOT_SET);
  }

  @Test
  void countBasedProgressCalculations() {
    Project project = createProject(ProjectStatus.ACTIVE, ProjectHealth.NOT_SET);
    List<ProjectTask> tasks =
        List.of(
            createTask(ProjectTaskStatus.DONE, 0, false),
            createTask(ProjectTaskStatus.TO_DO, 0, false),
            createTask(ProjectTaskStatus.IN_PROGRESS, 0, false),
            createTask(ProjectTaskStatus.BLOCKED, 0, false));

    ProjectProgress result =
        ProjectProgressCalculator.calculate(project, tasks, ProgressPolicy.COUNT, TEST_NOW);

    // 1 done out of 4 active tasks = 25%
    assertThat(result.percentage()).isEqualTo(25);
  }

  @Test
  void weightBasedProgressCalculationsUsingEstimateMinutes() {
    Project project = createProject(ProjectStatus.ACTIVE, ProjectHealth.NOT_SET);
    List<ProjectTask> tasks =
        List.of(
            createTask(ProjectTaskStatus.DONE, 60, false), // 60 mins done
            createTask(ProjectTaskStatus.TO_DO, 120, false), // 120 mins remaining
            createTask(ProjectTaskStatus.IN_PROGRESS, 60, false) // 60 mins remaining
            );

    ProjectProgress result =
        ProjectProgressCalculator.calculate(project, tasks, ProgressPolicy.WEIGHT, TEST_NOW);

    // 60 completed out of 240 total weight = 25%
    assertThat(result.percentage()).isEqualTo(25);
  }

  @Test
  void weightBasedProgressCalculationsWithFallbackWeight() {
    Project project = createProject(ProjectStatus.ACTIVE, ProjectHealth.NOT_SET);
    List<ProjectTask> tasks =
        List.of(
            createTask(ProjectTaskStatus.DONE, 0, false), // fallback to 1 done
            createTask(ProjectTaskStatus.TO_DO, 3, false) // 3 remaining
            );

    ProjectProgress result =
        ProjectProgressCalculator.calculate(project, tasks, ProgressPolicy.WEIGHT, TEST_NOW);

    // 1 completed out of 4 total weight = 25%
    assertThat(result.percentage()).isEqualTo(25);
  }

  @Test
  void roundingHonestyClampsPercentagesBetweenOneAndNinetyNine() {
    Project project = createProject(ProjectStatus.ACTIVE, ProjectHealth.NOT_SET);

    // Case 1: 1 task done out of 1000 tasks (0.1%) should clamp to 1% instead of rounding to 0%
    List<ProjectTask> tasks1 =
        List.of(
            createTask(ProjectTaskStatus.DONE, 1, false),
            createTask(ProjectTaskStatus.TO_DO, 999, false) // total weight 1000
            );
    ProjectProgress result1 =
        ProjectProgressCalculator.calculate(project, tasks1, ProgressPolicy.WEIGHT, TEST_NOW);
    assertThat(result1.percentage()).isEqualTo(1);

    // Case 2: 999 tasks done out of 1000 tasks (99.9%) should clamp to 99%
    // instead of rounding to 100%
    List<ProjectTask> tasks2 =
        List.of(
            createTask(ProjectTaskStatus.TO_DO, 1, false),
            createTask(ProjectTaskStatus.DONE, 999, false) // total weight 1000
            );
    ProjectProgress result2 =
        ProjectProgressCalculator.calculate(project, tasks2, ProgressPolicy.WEIGHT, TEST_NOW);
    assertThat(result2.percentage()).isEqualTo(99);
  }

  @Test
  void cancelledAndArchivedTasksAreExcludedFromCalculations() {
    Project project = createProject(ProjectStatus.ACTIVE, ProjectHealth.NOT_SET);
    List<ProjectTask> tasks =
        List.of(
            createTask(ProjectTaskStatus.DONE, 60, false), // 60 mins done (active)
            createTask(ProjectTaskStatus.TO_DO, 60, false), // 60 mins remaining (active)
            createTask(ProjectTaskStatus.DONE, 120, true), // 120 mins done (archived -> ignored)
            createTask(
                ProjectTaskStatus.CANCELLED, 60, false) // 60 mins done (cancelled -> ignored)
            );

    ProjectProgress resultCount =
        ProjectProgressCalculator.calculate(project, tasks, ProgressPolicy.COUNT, TEST_NOW);
    // Active: 1 done / 2 total = 50%
    assertThat(resultCount.percentage()).isEqualTo(50);

    ProjectProgress resultWeight =
        ProjectProgressCalculator.calculate(project, tasks, ProgressPolicy.WEIGHT, TEST_NOW);
    // Active: 60 done / 120 total = 50%
    assertThat(resultWeight.percentage()).isEqualTo(50);
  }

  @Test
  void manualHealthOverridesDerivedHealth() {
    Project project = createProject(ProjectStatus.ACTIVE, ProjectHealth.AT_RISK);
    List<ProjectTask> tasks =
        List.of(
            createTask(ProjectTaskStatus.TO_DO, 0, false) // Should derive to ON_TRACK
            );

    ProjectProgress result =
        ProjectProgressCalculator.calculate(project, tasks, ProgressPolicy.COUNT, TEST_NOW);

    assertThat(result.health()).isEqualTo(ProjectHealth.AT_RISK);
  }

  @Test
  void derivedHealthOverdueTaskResultsInOffTrack() {
    Project project = createProject(ProjectStatus.ACTIVE, ProjectHealth.NOT_SET);
    List<ProjectTask> tasks =
        List.of(
            createTaskWithDueDate(ProjectTaskStatus.TO_DO, TEST_NOW.minusSeconds(10)),
            createTask(ProjectTaskStatus.BLOCKED, 0, false) // Blocked as well
            );

    ProjectProgress result =
        ProjectProgressCalculator.calculate(project, tasks, ProgressPolicy.COUNT, TEST_NOW);

    // Overdue takes precedence and marks the project OFF_TRACK
    assertThat(result.health()).isEqualTo(ProjectHealth.OFF_TRACK);
  }

  @Test
  void derivedHealthBlockedTaskResultsInAtRisk() {
    Project project = createProject(ProjectStatus.ACTIVE, ProjectHealth.NOT_SET);
    List<ProjectTask> tasks =
        List.of(
            createTask(ProjectTaskStatus.BLOCKED, 0, false),
            createTask(ProjectTaskStatus.TO_DO, 0, false) // healthy
            );

    ProjectProgress result =
        ProjectProgressCalculator.calculate(project, tasks, ProgressPolicy.COUNT, TEST_NOW);

    assertThat(result.health()).isEqualTo(ProjectHealth.AT_RISK);
  }

  @Test
  void derivedHealthNoIssuesResultsInOnTrack() {
    Project project = createProject(ProjectStatus.ACTIVE, ProjectHealth.NOT_SET);
    List<ProjectTask> tasks =
        List.of(
            createTask(ProjectTaskStatus.TO_DO, 0, false),
            createTask(ProjectTaskStatus.IN_PROGRESS, 0, false));

    ProjectProgress result =
        ProjectProgressCalculator.calculate(project, tasks, ProgressPolicy.COUNT, TEST_NOW);

    assertThat(result.health()).isEqualTo(ProjectHealth.ON_TRACK);
  }

  @Test
  void nonActiveProjectDerivedHealthReturnsNotSet() {
    List<ProjectTask> tasks =
        List.of(
            createTask(ProjectTaskStatus.BLOCKED, 0, false) // Would otherwise derive AT_RISK
            );

    Project plannedProject = createProject(ProjectStatus.PLANNED, ProjectHealth.NOT_SET);
    ProjectProgress plannedResult =
        ProjectProgressCalculator.calculate(plannedProject, tasks, ProgressPolicy.COUNT, TEST_NOW);
    assertThat(plannedResult.health()).isEqualTo(ProjectHealth.NOT_SET);

    Project onHoldProject = createProject(ProjectStatus.ON_HOLD, ProjectHealth.NOT_SET);
    ProjectProgress onHoldResult =
        ProjectProgressCalculator.calculate(onHoldProject, tasks, ProgressPolicy.COUNT, TEST_NOW);
    assertThat(onHoldResult.health()).isEqualTo(ProjectHealth.NOT_SET);
  }

  @Test
  void completedOrCancelledProjectAlwaysForceNotSetHealth() {
    List<ProjectTask> tasks =
        List.of(
            createTask(ProjectTaskStatus.TO_DO, 0, false) // Would otherwise derive ON_TRACK
            );

    // Completed project with manual health set to ON_TRACK
    Project completedProject = createProject(ProjectStatus.COMPLETED, ProjectHealth.ON_TRACK);
    ProjectProgress completedResult =
        ProjectProgressCalculator.calculate(
            completedProject, tasks, ProgressPolicy.COUNT, TEST_NOW);
    assertThat(completedResult.health()).isEqualTo(ProjectHealth.NOT_SET);

    // Cancelled project with manual health set to ON_TRACK
    Project cancelledProject = createProject(ProjectStatus.CANCELLED, ProjectHealth.ON_TRACK);
    ProjectProgress cancelledResult =
        ProjectProgressCalculator.calculate(
            cancelledProject, tasks, ProgressPolicy.COUNT, TEST_NOW);
    assertThat(cancelledResult.health()).isEqualTo(ProjectHealth.NOT_SET);
  }

  private Project createProject(ProjectStatus status, ProjectHealth health) {
    return new Project(
        UUID.randomUUID(),
        USER_ID,
        "Project",
        Optional.empty(),
        status,
        ProjectPriority.P2,
        health,
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        TEST_NOW,
        TEST_NOW,
        Set.of(),
        0L);
  }

  private ProjectTask createTask(ProjectTaskStatus status, int estimateMinutes, boolean archived) {
    return new ProjectTask(UUID.randomUUID(), status, estimateMinutes, Optional.empty(), archived);
  }

  private ProjectTask createTaskWithDueDate(ProjectTaskStatus status, Instant dueAt) {
    return new ProjectTask(UUID.randomUUID(), status, 0, Optional.of(dueAt), false);
  }
}
