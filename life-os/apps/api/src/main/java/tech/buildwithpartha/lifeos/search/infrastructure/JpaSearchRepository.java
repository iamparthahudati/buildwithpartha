package tech.buildwithpartha.lifeos.search.infrastructure;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.search.domain.SearchEntityType;
import tech.buildwithpartha.lifeos.search.domain.SearchGroup;
import tech.buildwithpartha.lifeos.search.domain.SearchHighlighter;
import tech.buildwithpartha.lifeos.search.domain.SearchItem;
import tech.buildwithpartha.lifeos.search.domain.SearchQuery;
import tech.buildwithpartha.lifeos.search.domain.SearchRepository;
import tech.buildwithpartha.lifeos.search.domain.SearchResult;

/** JPA/SQL implementation of SearchRepository port (LOS-1301). */
@Repository
public class JpaSearchRepository implements SearchRepository {

  private static final int DEFAULT_GROUP_ITEM_LIMIT = 5;
  private final EntityManager entityManager;

  public JpaSearchRepository(EntityManager entityManager) {
    this.entityManager = Objects.requireNonNull(entityManager, "entityManager");
  }

  @Override
  public SearchResult search(SearchQuery searchQuery) {
    Objects.requireNonNull(searchQuery, "searchQuery");

    String rawQuery = searchQuery.query();
    if (rawQuery == null || rawQuery.isBlank()) {
      return SearchResult.empty(searchQuery);
    }

    String pattern = "%" + rawQuery.toLowerCase(Locale.ROOT) + "%";
    UUID userId = searchQuery.userId();

    Map<SearchEntityType, Long> counts = new EnumMap<>(SearchEntityType.class);
    for (SearchEntityType type : SearchEntityType.values()) {
      counts.put(type, 0L);
    }

    List<SearchItem> allItems = new ArrayList<>();

    for (SearchEntityType type : searchQuery.types()) {
      List<RawSearchRecord> records = fetchRecordsForType(type, userId, pattern);
      counts.put(type, (long) records.size());

      for (RawSearchRecord rec : records) {
        double score = calculateScore(rec.title(), rec.body(), rawQuery);
        String highlightedTitle = SearchHighlighter.highlight(rec.title(), rawQuery);
        String highlightedSnippet =
            SearchHighlighter.extractSnippetAndHighlight(rec.body(), rawQuery);

        allItems.add(
            new SearchItem(
                rec.id(),
                type,
                highlightedTitle,
                highlightedSnippet,
                score,
                rec.updatedAt(),
                type.buildTargetUrl(rec.id())));
      }
    }

    // Sort items by score DESC, then updatedAt DESC
    allItems.sort(
        (a, b) -> {
          int cmp = Double.compare(b.score(), a.score());
          if (cmp != 0) {
            return cmp;
          }
          return b.updatedAt().compareTo(a.updatedAt());
        });

    long totalItems = allItems.size();
    int size = searchQuery.size();
    int totalPages = size > 0 ? (int) Math.ceil((double) totalItems / size) : 0;

    int fromIndex = Math.min((int) totalItems, searchQuery.page() * size);
    int toIndex = Math.min((int) totalItems, fromIndex + size);
    List<SearchItem> paginatedItems =
        fromIndex < toIndex ? List.copyOf(allItems.subList(fromIndex, toIndex)) : List.of();

    // Group items by type
    Map<SearchEntityType, List<SearchItem>> itemsByType =
        allItems.stream().collect(Collectors.groupingBy(SearchItem::type));

    List<SearchGroup> groups = new ArrayList<>();
    for (SearchEntityType type : searchQuery.types()) {
      List<SearchItem> typeItems = itemsByType.getOrDefault(type, Collections.emptyList());
      if (!typeItems.isEmpty()) {
        List<SearchItem> groupTopItems =
            typeItems.subList(0, Math.min(typeItems.size(), DEFAULT_GROUP_ITEM_LIMIT));
        groups.add(new SearchGroup(type, typeItems.size(), groupTopItems));
      }
    }

    return new SearchResult(
        rawQuery, totalItems, searchQuery.page(), size, totalPages, counts, groups, paginatedItems);
  }

  @SuppressWarnings("unchecked")
  private List<RawSearchRecord> fetchRecordsForType(
      SearchEntityType type, UUID userId, String pattern) {
    String sql =
        switch (type) {
          case PROJECT ->
              """
              SELECT id, name AS title, COALESCE(description, '') AS body, updated_at
              FROM public.projects
              WHERE user_id = ?1
                AND (LOWER(name) LIKE ?2 OR LOWER(COALESCE(description, '')) LIKE ?2)
              """;
          case TASK ->
              """
              SELECT id, title AS title, COALESCE(description, '') AS body, updated_at
              FROM public.tasks
              WHERE user_id = ?1 AND deleted_at IS NULL
                AND (LOWER(title) LIKE ?2 OR LOWER(COALESCE(description, '')) LIKE ?2)
              """;
          case NOTE ->
              """
              SELECT id, title AS title, COALESCE(body, '') AS body, updated_at
              FROM public.notes
              WHERE user_id = ?1
                AND (LOWER(title) LIKE ?2 OR LOWER(COALESCE(body, '')) LIKE ?2)
              """;
          case BRAIN_DUMP ->
              """
              SELECT id, content AS title, COALESCE(content, '') AS body, updated_at
              FROM public.brain_dump_items
              WHERE user_id = ?1 AND archived_at IS NULL AND status != 'ARCHIVED'
                AND LOWER(content) LIKE ?2
              """;
          case GOAL ->
              """
              SELECT id, title AS title, COALESCE(description, '') AS body, updated_at
              FROM public.goals
              WHERE user_id = ?1
                AND (LOWER(title) LIKE ?2 OR LOWER(COALESCE(description, '')) LIKE ?2)
              """;
          case HABIT ->
              """
              SELECT id, name AS title, COALESCE(description, '') AS body, updated_at
              FROM public.habits
              WHERE user_id = ?1
                AND (LOWER(name) LIKE ?2 OR LOWER(COALESCE(description, '')) LIKE ?2)
              """;
        };

    Query nativeQuery = entityManager.createNativeQuery(sql);
    nativeQuery.setParameter(1, userId);
    nativeQuery.setParameter(2, pattern);

    List<?> rows = nativeQuery.getResultList();
    List<RawSearchRecord> records = new ArrayList<>(rows.size());

    for (Object item : rows) {
      if (!(item instanceof Object[] row)) {
        continue;
      }
      UUID id;
      if (row[0] instanceof UUID u) {
        id = u;
      } else if (row[0] instanceof byte[] bytes) {
        java.nio.ByteBuffer bb = java.nio.ByteBuffer.wrap(bytes);
        id = new UUID(bb.getLong(), bb.getLong());
      } else {
        continue;
      }

      String title = row[1] != null ? row[1].toString() : "";
      String body = row[2] != null ? row[2].toString() : "";
      Instant updatedAt = row[3] instanceof Timestamp ts ? ts.toInstant() : Instant.now();
      records.add(new RawSearchRecord(id, title, body, updatedAt));
    }

    return records;
  }

  private double calculateScore(String term, String title, String body) {
    if (term == null || term.isBlank()) {
      return 1.0;
    }
    String safeTitle = title != null ? title.toLowerCase(Locale.ROOT) : "";
    String safeBody = body != null ? body.toLowerCase(Locale.ROOT) : "";
    String lowerTerm = term.toLowerCase(Locale.ROOT);

    double score = 0.0;
    if (safeTitle.equals(lowerTerm)) {
      score += 100.0;
    } else if (safeTitle.startsWith(lowerTerm)) {
      score += 80.0;
    } else if (safeTitle.contains(lowerTerm)) {
      score += 50.0;
    }

    if (safeBody.contains(lowerTerm)) {
      score += 20.0;
    }
    return Math.max(score, 1.0);
  }

  private record RawSearchRecord(UUID id, String title, String body, Instant updatedAt) {}
}
