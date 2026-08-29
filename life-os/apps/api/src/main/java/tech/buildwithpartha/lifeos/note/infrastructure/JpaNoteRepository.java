package tech.buildwithpartha.lifeos.note.infrastructure;

import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
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
import tech.buildwithpartha.lifeos.note.domain.Note;
import tech.buildwithpartha.lifeos.note.domain.NoteQuery;
import tech.buildwithpartha.lifeos.note.domain.NoteQueryResult;
import tech.buildwithpartha.lifeos.note.domain.NoteRepository;

/** JPA adapter implementing {@link NoteRepository}. */
@Repository
public class JpaNoteRepository implements NoteRepository {

  private static final Set<String> ALLOWED_SORT_FIELDS =
      Set.of("title", "pinned", "archived", "createdAt", "updatedAt");

  private final NoteJpaRepository jpaRepository;
  private final EntityManager entityManager;

  public JpaNoteRepository(NoteJpaRepository jpaRepository, EntityManager entityManager) {
    this.jpaRepository = Objects.requireNonNull(jpaRepository, "jpaRepository must not be null");
    this.entityManager = Objects.requireNonNull(entityManager, "entityManager must not be null");
  }

  @Override
  public Note save(Note note) {
    Objects.requireNonNull(note, "note must not be null");
    NoteEntity entity = NoteEntity.fromDomain(note);
    NoteEntity saved = jpaRepository.saveAndFlush(entity);
    return saved.toDomain();
  }

  @Override
  public Optional<Note> findById(UUID id) {
    Objects.requireNonNull(id, "id must not be null");
    return jpaRepository.findById(id).map(NoteEntity::toDomain);
  }

  @Override
  public Optional<Note> findByIdAndUserId(UUID id, UUID userId) {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.findByIdAndUserId(id, userId).map(NoteEntity::toDomain);
  }

  @Override
  public List<Note> findByUserId(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return jpaRepository.findByUserId(userId).stream().map(NoteEntity::toDomain).toList();
  }

  @Override
  public void delete(Note note) {
    Objects.requireNonNull(note, "note must not be null");
    jpaRepository.delete(NoteEntity.fromDomain(note));
  }

  @Override
  public NoteQueryResult query(NoteQuery query) {
    Objects.requireNonNull(query, "query must not be null");

    CriteriaBuilder cb = entityManager.getCriteriaBuilder();

    // Data query
    CriteriaQuery<NoteEntity> cq = cb.createQuery(NoteEntity.class);
    Root<NoteEntity> root = cq.from(NoteEntity.class);
    List<Predicate> predicates = new ArrayList<>();

    // 1. User scoping (mandatory)
    predicates.add(cb.equal(root.get("userId"), query.userId()));

    // 2. Text search q
    if (query.q() != null && !query.q().isBlank()) {
      String searchPattern = "%" + query.q().trim().toLowerCase() + "%";
      Predicate titleLike = cb.like(cb.lower(root.get("title")), searchPattern);
      Predicate bodyLike = cb.like(cb.lower(root.get("body")), searchPattern);
      predicates.add(cb.or(titleLike, bodyLike));
    }

    // 3. Pinned
    if (query.pinned() != null) {
      predicates.add(cb.equal(root.get("pinned"), query.pinned()));
    }

    // 4. Archived
    if (query.archived() != null) {
      predicates.add(cb.equal(root.get("archived"), query.archived()));
    }

    // 5. Label IDs
    if (query.labelIds() != null && !query.labelIds().isEmpty()) {
      cq.distinct(true);
      Join<NoteEntity, UUID> labelJoin = root.join("labelIds");
      predicates.add(labelJoin.in(query.labelIds()));
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

    TypedQuery<NoteEntity> typedQuery = entityManager.createQuery(cq);
    typedQuery.setFirstResult(query.page() * query.size());
    typedQuery.setMaxResults(query.size());
    List<Note> notes = typedQuery.getResultList().stream().map(NoteEntity::toDomain).toList();

    // Count query
    CriteriaQuery<Long> countCq = cb.createQuery(Long.class);
    Root<NoteEntity> countRoot = countCq.from(NoteEntity.class);
    List<Predicate> countPredicates = new ArrayList<>();

    countPredicates.add(cb.equal(countRoot.get("userId"), query.userId()));

    if (query.q() != null && !query.q().isBlank()) {
      String searchPattern = "%" + query.q().trim().toLowerCase() + "%";
      Predicate titleLike = cb.like(cb.lower(countRoot.get("title")), searchPattern);
      Predicate bodyLike = cb.like(cb.lower(countRoot.get("body")), searchPattern);
      countPredicates.add(cb.or(titleLike, bodyLike));
    }

    if (query.pinned() != null) {
      countPredicates.add(cb.equal(countRoot.get("pinned"), query.pinned()));
    }

    if (query.archived() != null) {
      countPredicates.add(cb.equal(countRoot.get("archived"), query.archived()));
    }

    if (query.labelIds() != null && !query.labelIds().isEmpty()) {
      Join<NoteEntity, UUID> labelJoin = countRoot.join("labelIds");
      countPredicates.add(labelJoin.in(query.labelIds()));
      countCq.select(cb.countDistinct(countRoot));
    } else {
      countCq.select(cb.count(countRoot));
    }

    countCq.where(countPredicates.toArray(new Predicate[0]));
    Long total = entityManager.createQuery(countCq).getSingleResult();

    return new NoteQueryResult(notes, total != null ? total : 0L);
  }
}
