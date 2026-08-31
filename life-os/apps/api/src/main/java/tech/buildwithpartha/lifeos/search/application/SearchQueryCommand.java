package tech.buildwithpartha.lifeos.search.application;

import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import tech.buildwithpartha.lifeos.search.domain.SearchEntityType;

/** Command object for global search queries (LOS-1301). */
public record SearchQueryCommand(
    UUID userId, String query, Set<SearchEntityType> types, int page, int size) {

  public SearchQueryCommand {
    Objects.requireNonNull(userId, "userId");
    types = types == null ? Set.of() : Set.copyOf(types);
  }

  @Override
  public String toString() {
    return "SearchQueryCommand["
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
