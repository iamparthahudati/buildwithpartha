package tech.buildwithpartha.lifeos.braindump.infrastructure;

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
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItem;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemQuery;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemQueryResult;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemRepository;

@Repository
public class JpaBrainDumpItemRepository implements BrainDumpItemRepository {

  private static final Set<String> ALLOWED_SORT_FIELDS =
      Set.of("content", "status", "createdAt", "updatedAt");

  private final BrainDumpItemJpaRepository jpaRepository;
  private final EntityManager entityManager;

  public JpaBrainDumpItemRepository(
      BrainDumpItemJpaRepository jpaRepository, EntityManager entityManager) {
    this.jpaRepository = Objects.requireNonNull(jpaRepository, "jpaRepository must not be null");
    this.entityManager = Objects.requireNonNull(entityManager, "entityManager must not be null");
  }

  @Override
  public BrainDumpItem save(BrainDumpItem item) {
    Objects.requireNonNull(item, "item must not be null");
    BrainDumpItemEntity entity = BrainDumpItemEntity.fromDomain(item);
    BrainDumpItemEntity saved = jpaRepository.saveAndFlush(entity);
    return saved.toDomain();
  }

  @Override
  public Optional<BrainDumpItem> findById(UUID id) {
    Objects.requireNonNull(id, "id must not be null");
    return jpaRepository.findById(id).map(BrainDumpItemEntity::toDomain);
  }

  @Override
  public Optional<BrainDumpItem> findByIdAndUserId(UUID id, UUID userId) {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.findByIdAndUserId(id, userId).map(BrainDumpItemEntity::toDomain);
  }

  @Override
  public int countUnprocessedByUserId(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.countUnprocessedByUserId(userId);
  }

  @Override
  public void delete(BrainDumpItem item) {
    Objects.requireNonNull(item, "item must not be null");
    jpaRepository.delete(BrainDumpItemEntity.fromDomain(item));
  }

  @Override
  public BrainDumpItemQueryResult query(BrainDumpItemQuery query) {
    Objects.requireNonNull(query, "query must not be null");

    CriteriaBuilder cb = entityManager.getCriteriaBuilder();

    // Data query
    CriteriaQuery<BrainDumpItemEntity> cq = cb.createQuery(BrainDumpItemEntity.class);
    Root<BrainDumpItemEntity> root = cq.from(BrainDumpItemEntity.class);
    List<Predicate> predicates = new ArrayList<>();

    // 1. User scoping
    predicates.add(cb.equal(root.get("userId"), query.userId()));

    // 2. Text search q
    if (query.q() != null && !query.q().isBlank()) {
      String searchPattern = "%" + query.q().trim().toLowerCase() + "%";
      predicates.add(cb.like(cb.lower(root.get("content")), searchPattern));
    }

    // 3. Status
    if (query.status() != null) {
      predicates.add(cb.equal(root.get("status"), query.status()));
    }

    // 4. Archived
    if (query.archived() != null) {
      if (query.archived()) {
        predicates.add(cb.isNotNull(root.get("archivedAt")));
      } else {
        predicates.add(cb.isNull(root.get("archivedAt")));
      }
    }

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

    TypedQuery<BrainDumpItemEntity> typedQuery = entityManager.createQuery(cq);
    typedQuery.setFirstResult(query.page() * query.size());
    typedQuery.setMaxResults(query.size());
    List<BrainDumpItem> items = typedQuery.getResultList().stream().map(BrainDumpItemEntity::toDomain).toList();

    // Count query
    CriteriaQuery<Long> countCq = cb.createQuery(Long.class);
    Root<BrainDumpItemEntity> countRoot = countCq.from(BrainDumpItemEntity.class);
    List<Predicate> countPredicates = new ArrayList<>();

    countPredicates.add(cb.equal(countRoot.get("userId"), query.userId()));

    if (query.q() != null && !query.q().isBlank()) {
      String searchPattern = "%" + query.q().trim().toLowerCase() + "%";
      countPredicates.add(cb.like(cb.lower(countRoot.get("content")), searchPattern));
    }

    if (query.status() != null) {
      countPredicates.add(cb.equal(countRoot.get("status"), query.status()));
    }

    if (query.archived() != null) {
      if (query.archived()) {
        countPredicates.add(cb.isNotNull(countRoot.get("archivedAt")));
      } else {
        countPredicates.add(cb.isNull(countRoot.get("archivedAt")));
      }
    }

    countCq.select(cb.count(countRoot));
    countCq.where(countPredicates.toArray(new Predicate[0]));
    long totalItems = entityManager.createQuery(countCq).getSingleResult();

    return new BrainDumpItemQueryResult(items, totalItems);
  }
}
