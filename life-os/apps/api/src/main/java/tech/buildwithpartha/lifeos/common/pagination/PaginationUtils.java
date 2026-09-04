package tech.buildwithpartha.lifeos.common.pagination;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;

/** Common pagination, sort validation, and tie-breaking utilities across domain APIs. */
public final class PaginationUtils {

  public static final int DEFAULT_PAGE = 0;
  public static final int DEFAULT_PAGE_SIZE = 20;
  public static final int MAX_PAGE_SIZE = 100;
  public static final String DEFAULT_SORT_DIRECTION = "DESC";

  private PaginationUtils() {}

  /**
   * Validates and normalizes pagination and sorting parameters.
   *
   * @param page zero-based requested page number
   * @param size requested page size (max 100)
   * @param allowedSortFields set of valid field names permitted for sorting
   * @param sortBy requested sort field name
   * @param sortDirection requested sort direction ("ASC" or "DESC")
   * @return validated {@link PaginationParams} instance
   * @throws FieldValidationException if any parameter is invalid
   */
  public static PaginationParams validate(
      int page, int size, Set<String> allowedSortFields, String sortBy, String sortDirection) {

    List<FieldProblem> problems = new ArrayList<>();

    if (page < 0) {
      problems.add(new FieldProblem("page", "INVALID"));
    }
    if (size < 1 || size > MAX_PAGE_SIZE) {
      problems.add(new FieldProblem("size", "INVALID"));
    }
    if (sortBy != null && allowedSortFields != null && !allowedSortFields.contains(sortBy)) {
      problems.add(new FieldProblem("sortBy", "INVALID"));
    }
    if (sortDirection != null
        && !"ASC".equalsIgnoreCase(sortDirection)
        && !"DESC".equalsIgnoreCase(sortDirection)) {
      problems.add(new FieldProblem("sortDirection", "INVALID"));
    }

    if (!problems.isEmpty()) {
      throw new FieldValidationException("Validation failed", problems);
    }

    String normalizedDirection =
        sortDirection != null ? sortDirection.toUpperCase() : DEFAULT_SORT_DIRECTION;
    return new PaginationParams(page, size, sortBy, normalizedDirection);
  }

  /**
   * Validates page index and page size bounds without sorting parameters.
   *
   * @param page zero-based requested page number
   * @param size requested page size (max 100)
   * @return validated {@link PaginationParams} instance with null sort parameters
   * @throws FieldValidationException if page or size is invalid
   */
  public static PaginationParams validatePageAndSize(int page, int size) {
    return validate(page, size, null, null, null);
  }

  /**
   * Applies primary sort order and a secondary stable tie-breaker order (by entity primary key
   * "id") to a JPA CriteriaQuery.
   *
   * @param cb CriteriaBuilder
   * @param cq CriteriaQuery
   * @param root entity root
   * @param sortBy primary field name to sort by
   * @param sortDirection primary sort direction ("ASC" or "DESC")
   * @param allowedSortFields set of valid field names permitted for sorting
   * @param defaultSortBy default sort field if sortBy is null or invalid
   * @param <T> entity type
   */
  public static <T> void applyStableSort(
      CriteriaBuilder cb,
      CriteriaQuery<T> cq,
      Root<T> root,
      String sortBy,
      String sortDirection,
      Set<String> allowedSortFields,
      String defaultSortBy) {

    String targetSortBy =
        (sortBy != null && allowedSortFields != null && allowedSortFields.contains(sortBy))
            ? sortBy
            : defaultSortBy;
    boolean isAscending = "ASC".equalsIgnoreCase(sortDirection);

    Order primaryOrder =
        isAscending ? cb.asc(root.get(targetSortBy)) : cb.desc(root.get(targetSortBy));
    Order secondaryOrder = cb.desc(root.get("id"));

    cq.orderBy(primaryOrder, secondaryOrder);
  }
}
