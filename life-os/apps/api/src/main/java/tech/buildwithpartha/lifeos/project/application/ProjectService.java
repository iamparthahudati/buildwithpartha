package tech.buildwithpartha.lifeos.project.application;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.label.LabelOwnershipValidator;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;

/** Application service managing the transactional lifecycle of Projects (LOS-0702). */
@Service
public class ProjectService {

  private static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.project.audit");

  private final ProjectRepository projectRepository;
  private final LabelOwnershipValidator labelOwnershipValidator;
  private final Clock clock;

  public ProjectService(
      ProjectRepository projectRepository,
      LabelOwnershipValidator labelOwnershipValidator,
      Clock clock) {
    this.projectRepository = projectRepository;
    this.labelOwnershipValidator = labelOwnershipValidator;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public Project getProject(UUID userId, UUID id) {
    Project project =
        projectRepository
            .findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + id));

    if (!project.userId().equals(userId)) {
      throw new ResourceNotFoundException("Project not found: " + id);
    }
    return project;
  }

  @Transactional
  public Project createProject(UUID userId, CreateProjectCommand command) {
    validateDates(command.startDate(), command.deadlineDate());

    Set<UUID> labelIds = command.labelIds() != null ? command.labelIds() : Set.of();
    labelOwnershipValidator.validateOwnership(userId, labelIds);

    Instant now = clock.instant();
    Project project =
        new Project(
            UUID.randomUUID(),
            userId,
            command.name().trim(),
            Optional.ofNullable(command.description()).map(String::trim),
            command.status(),
            command.priority(),
            command.health(),
            Optional.ofNullable(command.color()).map(String::trim),
            Optional.ofNullable(command.icon()).map(String::trim),
            Optional.ofNullable(command.startDate()),
            Optional.ofNullable(command.deadlineDate()),
            Optional.ofNullable(command.estimateMinutes()),
            Optional.empty(),
            now,
            now,
            labelIds,
            0L);

    Project saved = projectRepository.save(project);
    AUDIT_LOGGER.info("event=project_created id={} userId={}", saved.id(), userId);
    return saved;
  }

  @Transactional
  public Project updateProject(UUID userId, UUID id, UpdateProjectCommand command) {
    Project existing = getProject(userId, id);

    if (existing.version() != command.version()) {
      throw new ConcurrencyConflictException("Project was modified by another request");
    }

    validateDates(command.startDate(), command.deadlineDate());

    Set<UUID> labelIds = command.labelIds() != null ? command.labelIds() : Set.of();
    labelOwnershipValidator.validateOwnership(userId, labelIds);

    Instant now = clock.instant();
    Project updated =
        existing.withUpdates(
            command.name().trim(),
            Optional.ofNullable(command.description()).map(String::trim),
            command.status(),
            command.priority(),
            command.health(),
            Optional.ofNullable(command.color()).map(String::trim),
            Optional.ofNullable(command.icon()).map(String::trim),
            Optional.ofNullable(command.startDate()),
            Optional.ofNullable(command.deadlineDate()),
            Optional.ofNullable(command.estimateMinutes()),
            labelIds,
            now);

    Project saved = projectRepository.save(updated);
    AUDIT_LOGGER.info("event=project_updated id={} userId={}", saved.id(), userId);
    return saved;
  }

  @Transactional
  public Project archiveProject(UUID userId, UUID id, long version) {
    Project existing = getProject(userId, id);

    if (existing.version() != version) {
      throw new ConcurrencyConflictException("Project was modified by another request");
    }

    if (existing.archivedAt().isPresent()) {
      return existing; // idempotent archive
    }

    Instant now = clock.instant();
    Project archived = existing.archive(now, now);
    Project saved = projectRepository.save(archived);

    AUDIT_LOGGER.info("event=project_archived id={} userId={}", saved.id(), userId);
    return saved;
  }

  @Transactional
  public Project restoreProject(UUID userId, UUID id, long version) {
    Project existing = getProject(userId, id);

    if (existing.version() != version) {
      throw new ConcurrencyConflictException("Project was modified by another request");
    }

    if (existing.archivedAt().isEmpty()) {
      return existing; // idempotent restore
    }

    Instant now = clock.instant();
    Project restored = existing.restore(now);
    Project saved = projectRepository.save(restored);

    AUDIT_LOGGER.info("event=project_restored id={} userId={}", saved.id(), userId);
    return saved;
  }

  @Transactional
  public void deleteProject(UUID userId, UUID id) {
    Project existing = getProject(userId, id);
    projectRepository.delete(existing);
    AUDIT_LOGGER.info("event=project_deleted id={} userId={}", id, userId);
  }

  private void validateDates(LocalDate startDate, LocalDate deadlineDate) {
    if (startDate != null && deadlineDate != null && deadlineDate.isBefore(startDate)) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("deadlineDate", "Range")));
    }
  }
}
