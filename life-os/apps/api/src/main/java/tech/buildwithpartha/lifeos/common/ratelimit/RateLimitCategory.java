package tech.buildwithpartha.lifeos.common.ratelimit;

/** Rate-limiting target categories for application policies. */
public enum RateLimitCategory {
  AUTH("auth"),
  SEARCH("search"),
  EXPORT("export"),
  WRITE("write");

  private final String label;

  RateLimitCategory(String label) {
    this.label = label;
  }

  public String label() {
    return label;
  }
}
