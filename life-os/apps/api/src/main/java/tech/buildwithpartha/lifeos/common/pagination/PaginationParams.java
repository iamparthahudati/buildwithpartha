package tech.buildwithpartha.lifeos.common.pagination;

/**
 * Immutable validated pagination and sort parameters used across domain queries.
 *
 * @param page zero-based page index (must be >= 0)
 * @param size page size (must be between 1 and 100)
 * @param sortBy validated property name to sort by, or null when sort is not specified
 * @param sortDirection normalized sort direction ("ASC" or "DESC"), or null when sort is not
 *     specified
 */
public record PaginationParams(int page, int size, String sortBy, String sortDirection) {

  public PaginationParams {
    if (page < 0) {
      throw new IllegalArgumentException("page must be zero or greater");
    }
    if (size < 1 || size > PaginationUtils.MAX_PAGE_SIZE) {
      throw new IllegalArgumentException(
          "size must be between 1 and " + PaginationUtils.MAX_PAGE_SIZE);
    }
    if (sortDirection != null
        && !"ASC".equalsIgnoreCase(sortDirection)
        && !"DESC".equalsIgnoreCase(sortDirection)) {
      throw new IllegalArgumentException("sortDirection must be ASC or DESC");
    }
  }

  public boolean isAscending() {
    return "ASC".equalsIgnoreCase(sortDirection);
  }
}
