package tech.buildwithpartha.lifeos.search.domain;

import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Domain query value object for global search (LOS-1301). */
public record SearchQuery(
    UUID userId, String query, Set<SearchEntityType> types, int page, int size) {

  public SearchQuery {
    Objects.requireNonNull(userId, "userId");
    types =
        types == null || types.isEmpty() ? Set.of(SearchEntityType.values()) : Set.copyOf(types);
    if (page < 0) {
      page = 0;
    }
    if (size < 1) {
      size = 20;
    } else if (size > 100) {
      size = 100;
    }
    if (query == null) {
      query = "";
    } else {
      query = query.trim();
    }
  }

  @Override
  public String toString() {
    return "SearchQuery["
        + "userId="
        + userId
        + ", query=[REDACTED]"
        + ", types="
        + types
        + ", page="
        + page
        + ", size="
        + size
        + ']';
  }
}
