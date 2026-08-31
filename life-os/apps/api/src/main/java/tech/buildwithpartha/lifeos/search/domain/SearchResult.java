package tech.buildwithpartha.lifeos.search.domain;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Domain record wrapping overall search query results and breakdowns (LOS-1301). */
public record SearchResult(
    String query,
    long totalItems,
    int page,
    int size,
    int totalPages,
    Map<SearchEntityType, Long> counts,
    List<SearchGroup> groups,
    List<SearchItem> items) {

  public SearchResult {
    counts = counts == null ? Map.of() : Map.copyOf(counts);
    groups = groups == null ? List.of() : List.copyOf(groups);
    items = items == null ? List.of() : List.copyOf(items);
  }

  public static SearchResult empty(SearchQuery query) {
    Objects.requireNonNull(query, "query");
    Map<SearchEntityType, Long> zeroCounts =
        Map.of(
            SearchEntityType.PROJECT, 0L,
            SearchEntityType.TASK, 0L,
            SearchEntityType.NOTE, 0L,
            SearchEntityType.BRAIN_DUMP, 0L,
            SearchEntityType.GOAL, 0L,
            SearchEntityType.HABIT, 0L);
    return new SearchResult(
        query.query(), 0L, query.page(), query.size(), 0, zeroCounts, List.of(), List.of());
  }

  @Override
  public String toString() {
    return "SearchResult["
        + "query=[REDACTED]"
        + ", totalItems="
        + totalItems
        + ", page="
        + page
        + ", size="
        + size
        + ", totalPages="
        + totalPages
        + ", counts="
        + counts.size()
        + " entries"
        + ", groups="
        + groups.size()
        + " groups"
        + ", items="
        + items.size()
        + " items"
        + ']';
  }
}
