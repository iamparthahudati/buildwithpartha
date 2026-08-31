package tech.buildwithpartha.lifeos.search.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Domain record representing a single global search result item (LOS-1301). */
public record SearchItem(
    UUID id,
    SearchEntityType type,
    String title,
    String snippet,
    double score,
    Instant updatedAt,
    String targetUrl) {

  public SearchItem {
    Objects.requireNonNull(id, "id");
    Objects.requireNonNull(type, "type");
    Objects.requireNonNull(updatedAt, "updatedAt");
    if (title == null) {
      title = "";
    }
    if (snippet == null) {
      snippet = "";
    }
    if (targetUrl == null) {
      targetUrl = type.buildTargetUrl(id);
    }
  }

  @Override
  public String toString() {
    return "SearchItem["
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
        + ", targetUrl="
        + targetUrl
        + ']';
  }
}
