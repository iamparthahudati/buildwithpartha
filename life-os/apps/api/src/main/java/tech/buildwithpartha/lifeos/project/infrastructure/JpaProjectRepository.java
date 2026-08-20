package tech.buildwithpartha.lifeos.project.infrastructure;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectQuery;
import tech.buildwithpartha.lifeos.project.domain.ProjectQueryResult;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;
import tech.buildwithpartha.lifeos.project.domain.ProjectSummaryCounts;

/** Adapter implementing {@link ProjectRepository} using Spring Data JPA. */
@Repository
public class JpaProjectRepository implements ProjectRepository {

  private final ProjectJpaRepository jpaRepository;
  private final EntityManager entityManager;

  public JpaProjectRepository(ProjectJpaRepository jpaRepository, EntityManager entityManager) {
    this.jpaRepository = jpaRepository;
    this.entityManager = entityManager;
  }

  @Override
  public Optional<Project> findById(UUID id) {
    return jpaRepository.findById(id).map(JpaProjectRepository::toDomain);
  }

  @Override
  public List<Project> findByUserId(UUID userId) {
    return jpaRepository.findByUserId(userId).stream().map(JpaProjectRepository::toDomain).toList();
  }

  @Override
  public Project save(Project project) {
    ProjectEntity entity = toEntity(project);
    ProjectEntity saved = jpaRepository.saveAndFlush(entity);
    return toDomain(saved);
  }

  @Override
  public void delete(Project project) {
    jpaRepository.delete(toEntity(project));
  }

  @Override
  public ProjectQueryResult query(ProjectQuery query) {
    CriteriaBuilder cb = entityManager.getCriteriaBuilder();
    CriteriaQuery<ProjectEntity> cq = cb.createQuery(ProjectEntity.class);
    Root<ProjectEntity> root = cq.from(ProjectEntity.class);

    List<Predicate> predicates = new ArrayList<>();

    // 1. User scoping (mandatory)
    predicates.add(cb.equal(root.get("userId"), query.userId()));

    // 2. Text search (case-insensitive partial match on name or description)
    if (query.q() != null && !query.q().isBlank()) {
      String searchPattern = "%" + query.q().trim().toLowerCase() + "%";
      Predicate nameLike = cb.like(cb.lower(root.get("name")), searchPattern);
      Predicate descLike = cb.like(cb.lower(root.get("description")), searchPattern);
      predicates.add(cb.or(nameLike, descLike));
    }

    // 3. Filter by statuses
    if (!query.statuses().isEmpty()) {
      predicates.add(root.get("status").in(query.statuses()));
    }

    // 4. Filter by priorities
    if (!query.priorities().isEmpty()) {
      predicates.add(root.get("priority").in(query.priorities()));
    }

    // 5. Filter by healths
    if (!query.healths().isEmpty()) {
      predicates.add(root.get("health").in(query.healths()));
    }

    // 6. Filter by labels (join project_labels collection)
    if (!query.labelIds().isEmpty()) {
      cq.distinct(true);
      Join<ProjectEntity, UUID> labelJoin = root.join("labelIds");
      predicates.add(labelJoin.in(query.labelIds()));
    }

    // 7. Filter by deadlineBefore
    if (query.deadlineBefore() != null) {
      predicates.add(cb.lessThanOrEqualTo(root.get("deadlineDate"), query.deadlineBefore()));
    }

    // 8. Filter by deadlineAfter
    if (query.deadlineAfter() != null) {
      predicates.add(cb.greaterThanOrEqualTo(root.get("deadlineDate"), query.deadlineAfter()));
    }

    // 9. Filter by archived (active vs archived status)
    if (query.archived() != null) {
      if (query.archived()) {
        predicates.add(cb.isNotNull(root.get("archivedAt")));
      } else {
        predicates.add(cb.isNull(root.get("archivedAt")));
      }
    }

    cq.where(predicates.toArray(new Predicate[0]));

    // Stable Sorting
    String sortBy = query.sortBy() != null ? query.sortBy() : "updatedAt";
    String sortDir = query.sortDirection() != null ? query.sortDirection() : "DESC";

    Order primaryOrder;
    if ("asc".equalsIgnoreCase(sortDir)) {
      primaryOrder = cb.asc(root.get(sortBy));
    } else {
      primaryOrder = cb.desc(root.get(sortBy));
    }
    Order secondaryOrder = cb.asc(root.get("id"));
    cq.orderBy(primaryOrder, secondaryOrder);

    // Build the Count Query
    CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
    Root<ProjectEntity> countRoot = countQuery.from(ProjectEntity.class);

    List<Predicate> countPredicates = new ArrayList<>();
    countPredicates.add(cb.equal(countRoot.get("userId"), query.userId()));

    if (query.q() != null && !query.q().isBlank()) {
      String searchPattern = "%" + query.q().trim().toLowerCase() + "%";
      Predicate nameLike = cb.like(cb.lower(countRoot.get("name")), searchPattern);
      Predicate descLike = cb.like(cb.lower(countRoot.get("description")), searchPattern);
      countPredicates.add(cb.or(nameLike, descLike));
    }

    if (!query.statuses().isEmpty()) {
      countPredicates.add(countRoot.get("status").in(query.statuses()));
    }

    if (!query.priorities().isEmpty()) {
      countPredicates.add(countRoot.get("priority").in(query.priorities()));
    }

    if (!query.healths().isEmpty()) {
      countPredicates.add(countRoot.get("health").in(query.healths()));
    }

    if (!query.labelIds().isEmpty()) {
      Join<ProjectEntity, UUID> labelJoin = countRoot.join("labelIds");
      countPredicates.add(labelJoin.in(query.labelIds()));
      countQuery.select(cb.countDistinct(countRoot));
    } else {
      countQuery.select(cb.count(countRoot));
    }

    if (query.deadlineBefore() != null) {
      countPredicates.add(
          cb.lessThanOrEqualTo(countRoot.get("deadlineDate"), query.deadlineBefore()));
    }

    if (query.deadlineAfter() != null) {
      countPredicates.add(
          cb.greaterThanOrEqualTo(countRoot.get("deadlineDate"), query.deadlineAfter()));
    }

    if (query.archived() != null) {
      if (query.archived()) {
        countPredicates.add(cb.isNotNull(countRoot.get("archivedAt")));
      } else {
        countPredicates.add(cb.isNull(countRoot.get("archivedAt")));
      }
    }

    countQuery.where(countPredicates.toArray(new Predicate[0]));
    long totalItems = entityManager.createQuery(countQuery).getSingleResult();

    // Query Results with Pagination
    TypedQuery<ProjectEntity> typedQuery = entityManager.createQuery(cq);
    typedQuery.setFirstResult(query.page() * query.size());
    typedQuery.setMaxResults(query.size());
    List<ProjectEntity> entities = typedQuery.getResultList();

    List<Project> domainProjects = entities.stream().map(JpaProjectRepository::toDomain).toList();

    return new ProjectQueryResult(domainProjects, totalItems);
  }

  @Override
  public ProjectSummaryCounts getSummaryCounts(UUID userId) {
    String sql =
        """
        SELECT
            COUNT(*),
            COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END),
            COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END),
            COUNT(CASE WHEN status = 'ON_HOLD' THEN 1 END),
            COUNT(CASE WHEN health = 'AT_RISK' OR health = 'OFF_TRACK' THEN 1 END)
        FROM public.projects
        WHERE user_id = :userId AND archived_at IS NULL
        """;

    Query query = entityManager.createNativeQuery(sql);
    query.setParameter("userId", userId);
    Object[] result = (Object[]) query.getSingleResult();

    long total = ((Number) result[0]).longValue();
    long active = ((Number) result[1]).longValue();
    long completed = ((Number) result[2]).longValue();
    long onHold = ((Number) result[3]).longValue();
    long atRisk = ((Number) result[4]).longValue();

    return new ProjectSummaryCounts(total, active, completed, onHold, atRisk);
  }

  static Project toDomain(ProjectEntity entity) {
    return new Project(
        entity.getId(),
        entity.getUserId(),
        entity.getName(),
        Optional.ofNullable(entity.getDescription()),
        entity.getStatus(),
        entity.getPriority(),
        entity.getHealth(),
        Optional.ofNullable(entity.getColor()),
        Optional.ofNullable(entity.getIcon()),
        Optional.ofNullable(entity.getStartDate()),
        Optional.ofNullable(entity.getDeadlineDate()),
        Optional.ofNullable(entity.getEstimateMinutes()),
        Optional.ofNullable(entity.getArchivedAt()),
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        entity.getLabelIds(),
        entity.getVersion());
  }

  static ProjectEntity toEntity(Project domain) {
    return new ProjectEntity(
        domain.id(),
        domain.userId(),
        domain.name(),
        domain.description().orElse(null),
        domain.status(),
        domain.priority(),
        domain.health(),
        domain.color().orElse(null),
        domain.icon().orElse(null),
        domain.startDate().orElse(null),
        domain.deadlineDate().orElse(null),
        domain.estimateMinutes().orElse(null),
        domain.archivedAt().orElse(null),
        domain.createdAt(),
        domain.updatedAt(),
        domain.labelIds(),
        domain.version());
  }
}
