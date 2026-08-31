package tech.buildwithpartha.lifeos.search.api;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import tech.buildwithpartha.lifeos.search.domain.SearchResult;

/** REST DTO envelope for global search query response (LOS-1301). */
public record SearchResponse(
    String query,
    long totalItems,
    int page,
    int size,
    int totalPages,
    Map<String, Long> counts,
    List<SearchGroupResponse> groups,
    List<SearchResultItemResponse> items) {

  public SearchResponse {
    counts = counts == null ? Map.of() : Map.copyOf(counts);
    groups = groups == null ? List.of() : List.copyOf(groups);
    items = items == null ? List.of() : List.copyOf(items);
  }

  public static SearchResponse fromDomain(SearchResult result) {
    Objects.requireNonNull(result, "result");
    Map<String, Long> countMap =
        result.counts().entrySet().stream()
            .collect(Collectors.toMap(e -> e.getKey().name(), Map.Entry::getValue));

    List<SearchGroupResponse> groupResponses =
        result.groups().stream().map(SearchGroupResponse::fromDomain).toList();

    List<SearchResultItemResponse> itemResponses =
        result.items().stream().map(SearchResultItemResponse::fromDomain).toList();

    return new SearchResponse(
        result.query(),
        result.totalItems(),
        result.page(),
        result.size(),
        result.totalPages(),
        countMap,
        groupResponses,
        itemResponses);
  }

  @Override
  public String toString() {
    return "SearchResponse["
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
