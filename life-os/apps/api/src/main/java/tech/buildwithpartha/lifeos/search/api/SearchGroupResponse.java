package tech.buildwithpartha.lifeos.search.api;

import java.util.List;
import java.util.Objects;
import tech.buildwithpartha.lifeos.search.domain.SearchGroup;

/** REST DTO for grouped global search result per entity type (LOS-1301). */
public record SearchGroupResponse(
    String type, long totalItems, List<SearchResultItemResponse> items) {

  public SearchGroupResponse {
    Objects.requireNonNull(type, "type");
    items = items == null ? List.of() : List.copyOf(items);
  }

  public static SearchGroupResponse fromDomain(SearchGroup group) {
    Objects.requireNonNull(group, "group");
    List<SearchResultItemResponse> itemResponses =
        group.items().stream().map(SearchResultItemResponse::fromDomain).toList();
    return new SearchGroupResponse(group.type().name(), group.totalItems(), itemResponses);
  }
}
