package tech.buildwithpartha.lifeos.search.domain;

import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

/** Approved target entity types for global search (LOS-1301). */
public enum SearchEntityType {
  PROJECT("/life-os/app/projects/"),
  TASK("/life-os/app/tasks/"),
  NOTE("/life-os/app/notes/"),
  BRAIN_DUMP("/life-os/app/brain-dump"),
  GOAL("/life-os/app/goals/"),
  HABIT("/life-os/app/habits/");

  private final String urlPrefix;

  SearchEntityType(String urlPrefix) {
    this.urlPrefix = Objects.requireNonNull(urlPrefix, "urlPrefix");
  }

  public String buildTargetUrl(UUID id) {
    if (this == BRAIN_DUMP) {
      return urlPrefix;
    }
    if (id == null) {
      return urlPrefix;
    }
    return urlPrefix + id;
  }

  public static SearchEntityType parse(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    String normalized = value.trim().toUpperCase(Locale.ROOT).replace('-', '_');
    if ("BRAINDUMP".equals(normalized)) {
      return BRAIN_DUMP;
    }
    try {
      return SearchEntityType.valueOf(normalized);
    } catch (IllegalArgumentException e) {
      return null;
    }
  }
}
