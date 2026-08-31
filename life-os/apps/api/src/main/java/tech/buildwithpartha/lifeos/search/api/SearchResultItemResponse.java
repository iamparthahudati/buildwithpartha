package tech.buildwithpartha.lifeos.search.api;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import tech.buildwithpartha.lifeos.search.domain.SearchItem;

/** REST DTO for individual global search result item (LOS-1301). */
public record SearchResultItemResponse(
    UUID id,
    String type,
    String title,
    String snippet,
    double score,
    Instant updatedAt,
    String href) {

  public SearchResultItemResponse {
    Objects.requireNonNull(id, "id");
    Objects.requireNonNull(type, "type");
    Objects.requireNonNull(updatedAt, "updatedAt");
    if (title == null) {
      title = "";
    }
    if (snippet == null) {
      snippet = "";
    }
    if (href == null) {
      href = "";
    }
  }

  public static SearchResultItemResponse fromDomain(SearchItem item) {
    Objects.requireNonNull(item, "item");
    return new SearchResultItemResponse(
        item.id(),
        item.type().name(),
        item.title(),
        item.snippet(),
        item.score(),
        item.updatedAt(),
        item.targetUrl());
  }

  @Override
  public String toString() {
    return "SearchResultItemResponse["
        + "id="
        + id
        + ", type="
        + type
        + ", title=[REDACTED]"
        + ", snippet=[REDACTED]"
        + ", score="
        + score
        + ", updatedAt="
        + updatedAt
        + ", href="
        + href
        + ']';
  }
}
