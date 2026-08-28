package tech.buildwithpartha.lifeos.goal.infrastructure;

import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.goal.domain.Goal;
import tech.buildwithpartha.lifeos.goal.domain.GoalQuery;
import tech.buildwithpartha.lifeos.goal.domain.GoalQueryResult;
import tech.buildwithpartha.lifeos.goal.domain.GoalRepository;
import tech.buildwithpartha.lifeos.goal.domain.GoalStatus;
import tech.buildwithpartha.lifeos.goal.domain.GoalSummaryCounts;

/** JPA adapter implementing {@link GoalRepository}. */
@Repository
public class JpaGoalRepository implements GoalRepository {

  private static final Set<String> ALLOWED_SORT_FIELDS =
      Set.of("title", "category", "status", "progressType", "targetDate", "createdAt", "updatedAt");

  private final GoalJpaRepository jpaRepository;
  private final EntityManager entityManager;

  public JpaGoalRepository(GoalJpaRepository jpaRepository, EntityManager entityManager) {
    this.jpaRepository = Objects.requireNonNull(jpaRepository, "jpaRepository must not be null");
    this.entityManager = Objects.requireNonNull(entityManager, "entityManager must not be null");
  }

  @Override
  public Goal save(Goal goal) {
    Objects.requireNonNull(goal, "goal must not be null");
    GoalEntity entity = GoalEntity.fromDomain(goal);
    return jpaRepository.saveAndFlush(entity).toDomain();
  }

  @Override
  public Optional<Goal> findById(UUID id) {
    Objects.requireNonNull(id, "id must not be null");
    return jpaRepository.findById(id).map(GoalEntity::toDomain);
  }

  @Override
  public Optional<Goal> findByIdAndUserId(UUID id, UUID userId) {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.findByIdAndUserId(id, userId).map(GoalEntity::toDomain);
  }

  @Override
  public List<Goal> findByUserId(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.findByUserId(userId).stream().map(GoalEntity::toDomain).toList();
  }

  @Override
  public List<Goal> findByUserIdAndStatus(UUID userId, GoalStatus status) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(status, "status must not be null");
    return jpaRepository.findByUserIdAndStatus(userId, status).stream()
        .map(GoalEntity::toDomain)
        .toList();
  }

  @Override
  public List<Goal> findByUserIdAndCategory(UUID userId, String category) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(category, "category must not be null");
    return jpaRepository.findByUserIdAndCategory(userId, category).stream()
        .map(GoalEntity::toDomain)
        .toList();
  }

  @Override
  public GoalQueryResult queryGoals(GoalQuery query) {
    Objects.requireNonNull(query, "query must not be null");

    CriteriaBuilder cb = entityManager.getCriteriaBuilder();

    // Data query
    CriteriaQuery<GoalEntity> cq = cb.createQuery(GoalEntity.class);
    Root<GoalEntity> root = cq.from(GoalEntity.class);
    List<Predicate> predicates = buildPredicates(query, cb, root);
    cq.where(predicates.toArray(new Predicate[0]));

    // Sorting
    String sortBy =
        (query.sortBy() != null && ALLOWED_SORT_FIELDS.contains(query.sortBy()))
            ? query.sortBy()
            : "updatedAt";
    boolean isAscending = "ASC".equalsIgnoreCase(query.sortDirection());
    Order primaryOrder = isAscending ? cb.asc(root.get(sortBy)) : cb.desc(root.get(sortBy));
    Order secondaryOrder = cb.desc(root.get("id"));
    cq.orderBy(primaryOrder, secondaryOrder);

    TypedQuery<GoalEntity> typedQuery = entityManager.createQuery(cq);
    typedQuery.setFirstResult(query.page() * query.size());
    typedQuery.setMaxResults(query.size());
    List<Goal> goals = typedQuery.getResultList().stream().map(GoalEntity::toDomain).toList();

    // Count query
    CriteriaQuery<Long> countCq = cb.createQuery(Long.class);
    Root<GoalEntity> countRoot = countCq.from(GoalEntity.class);
    List<Predicate> countPredicates = buildPredicates(query, cb, countRoot);
    countCq.select(cb.count(countRoot)).where(countPredicates.toArray(new Predicate[0]));
    Long total = entityManager.createQuery(countCq).getSingleResult();

    return new GoalQueryResult(goals, total != null ? total : 0L);
  }

  @Override
  public GoalSummaryCounts getSummaryCounts(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");

    CriteriaBuilder cb = entityManager.getCriteriaBuilder();
    CriteriaQuery<GoalEntity> cq = cb.createQuery(GoalEntity.class);
    Root<GoalEntity> root = cq.from(GoalEntity.class);
    cq.where(cb.equal(root.get("userId"), userId));

    List<GoalEntity> allGoals = entityManager.createQuery(cq).getResultList();

    long total = allGoals.size();
    long active =
        allGoals.stream()
            .filter(
                g ->
                    !g.isArchived()
                        && g.getStatus() != GoalStatus.COMPLETED
                        && g.getStatus() != GoalStatus.CANCELLED)
            .count();
    long completed = allGoals.stream().filter(g -> g.getStatus() == GoalStatus.COMPLETED).count();
    long paused = allGoals.stream().filter(g -> g.getStatus() == GoalStatus.PAUSED).count();
    long archived = allGoals.stream().filter(GoalEntity::isArchived).count();

    return new GoalSummaryCounts(total, active, completed, paused, archived);
  }

  private List<Predicate> buildPredicates(
      GoalQuery query, CriteriaBuilder cb, Root<GoalEntity> root) {
    List<Predicate> predicates = new ArrayList<>();

    // 1. User isolation
    predicates.add(cb.equal(root.get("userId"), query.userId()));

    // 2. Search query (title, description, category)
    if (query.q() != null && !query.q().isBlank()) {
      String pattern = "%" + query.q().trim().toLowerCase() + "%";
      Predicate titleLike = cb.like(cb.lower(root.get("title")), pattern);
      Predicate descLike = cb.like(cb.lower(root.get("description")), pattern);
      Predicate catLike = cb.like(cb.lower(root.get("category")), pattern);
      predicates.add(cb.or(titleLike, descLike, catLike));
    }

    // 3. Statuses
    if (query.statuses() != null && !query.statuses().isEmpty()) {
      predicates.add(root.get("status").in(query.statuses()));
    }

    // 4. Category
    if (query.category() != null && !query.category().isBlank()) {
      predicates.add(
          cb.equal(cb.lower(root.get("category")), query.category().trim().toLowerCase()));
    }

    // 5. Progress types
    if (query.progressTypes() != null && !query.progressTypes().isEmpty()) {
      predicates.add(root.get("progressType").in(query.progressTypes()));
    }

    // 6. Archived
    if (query.archived() != null) {
      predicates.add(cb.equal(root.get("archived"), query.archived()));
    }

    return predicates;
  }

  @Override
  public void delete(Goal goal) {
    Objects.requireNonNull(goal, "goal must not be null");
    deleteById(goal.id());
  }

  @Override
  public void deleteById(UUID id) {
    Objects.requireNonNull(id, "id must not be null");
    jpaRepository.deleteById(id);
  }
}
