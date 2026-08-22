package tech.buildwithpartha.lifeos.project.application;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.project.domain.Milestone;
import tech.buildwithpartha.lifeos.project.domain.MilestoneRepository;
import tech.buildwithpartha.lifeos.project.domain.MilestoneStatus;
import tech.buildwithpartha.lifeos.project.domain.Project;

/** Application service managing the transactional lifecycle of Milestones (LOS-0704). */
@Service
public class MilestoneService {

  private static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.project.audit");

  private final MilestoneRepository milestoneRepository;
  private final ProjectService projectService;
  private final Clock clock;

  public MilestoneService(
      MilestoneRepository milestoneRepository, ProjectService projectService, Clock clock) {
    this.milestoneRepository = milestoneRepository;
    this.projectService = projectService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<Milestone> getMilestones(UUID userId, UUID projectId) {
    // Validates that project exists and belongs to user
    projectService.getProject(userId, projectId);

    return milestoneRepository.findByProjectId(projectId).stream()
        .sorted(Comparator.comparingInt(Milestone::ordering).thenComparing(Milestone::createdAt))
        .toList();
  }

  @Transactional
  public Milestone createMilestone(UUID userId, UUID projectId, CreateMilestoneCommand command) {
    Project project = projectService.getProject(userId, projectId);

    validateMilestoneDate(command.date(), project);

    Instant now = clock.instant();
    Milestone milestone =
        new Milestone(
            UUID.randomUUID(),
            projectId,
            command.title().trim(),
            Optional.ofNullable(command.date()),
            command.status() != null ? command.status() : MilestoneStatus.PLANNED,
            command.ordering(),
            now,
            now,
            0L);

    Milestone saved = milestoneRepository.save(milestone);
    AUDIT_LOGGER.info(
        "event=milestone_created id={} projectId={} userId={}", saved.id(), projectId, userId);
    return saved;
  }

  @Transactional
  public Milestone updateMilestone(
      UUID userId, UUID projectId, UUID milestoneId, UpdateMilestoneCommand command) {
    Project project = projectService.getProject(userId, projectId);
    Milestone existing = getMilestone(projectId, milestoneId);

    if (existing.version() != command.version()) {
      throw new ConcurrencyConflictException("Milestone was modified by another request");
    }

    validateMilestoneDate(command.date(), project);

    Instant now = clock.instant();
    Milestone updated =
        existing.withUpdates(
            command.title().trim(),
            Optional.ofNullable(command.date()),
            command.status(),
            command.ordering(),
            now);

    Milestone saved = milestoneRepository.save(updated);
    AUDIT_LOGGER.info(
        "event=milestone_updated id={} projectId={} userId={}", saved.id(), projectId, userId);
    return saved;
  }

  @Transactional
  public Milestone updateMilestoneStatus(
      UUID userId, UUID projectId, UUID milestoneId, MilestoneStatus status, long version) {
    projectService.getProject(userId, projectId);
    Milestone existing = getMilestone(projectId, milestoneId);

    if (existing.version() != version) {
      throw new ConcurrencyConflictException("Milestone was modified by another request");
    }

    Instant now = clock.instant();
    Milestone updated =
        existing.withUpdates(existing.title(), existing.date(), status, existing.ordering(), now);

    Milestone saved = milestoneRepository.save(updated);
    AUDIT_LOGGER.info(
        "event=milestone_status_updated id={} projectId={} userId={} status={}",
        saved.id(),
        projectId,
        userId,
        status.name());
    return saved;
  }

  @Transactional
  public void deleteMilestone(UUID userId, UUID projectId, UUID milestoneId) {
    projectService.getProject(userId, projectId);
    Milestone existing = getMilestone(projectId, milestoneId);

    milestoneRepository.delete(existing);
    AUDIT_LOGGER.info(
        "event=milestone_deleted id={} projectId={} userId={}", milestoneId, projectId, userId);
  }

  private Milestone getMilestone(UUID projectId, UUID milestoneId) {
    Milestone milestone =
        milestoneRepository
            .findById(milestoneId)
            .orElseThrow(
                () -> new ResourceNotFoundException("Milestone not found: " + milestoneId));

    if (!milestone.projectId().equals(projectId)) {
      throw new ResourceNotFoundException("Milestone not found: " + milestoneId);
    }
    return milestone;
  }

  private void validateMilestoneDate(LocalDate date, Project project) {
    if (date != null) {
      if (project.startDate().isPresent() && date.isBefore(project.startDate().get())) {
        throw new FieldValidationException(
            "Validation failed", List.of(new FieldProblem("date", "Range")));
      }
      if (project.deadlineDate().isPresent() && date.isAfter(project.deadlineDate().get())) {
        throw new FieldValidationException(
            "Validation failed", List.of(new FieldProblem("date", "Range")));
      }
    }
  }
}
