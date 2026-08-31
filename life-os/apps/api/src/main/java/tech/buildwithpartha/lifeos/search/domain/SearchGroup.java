package tech.buildwithpartha.lifeos.search.domain;

import java.util.List;
import java.util.Objects;

/** Domain record representing grouped search results for an entity type (LOS-1301). */
public record SearchGroup(SearchEntityType type, long totalItems, List<SearchItem> items) {

  public SearchGroup {
    Objects.requireNonNull(type, "type");
    items = items == null ? List.of() : List.copyOf(items);
  }
}
