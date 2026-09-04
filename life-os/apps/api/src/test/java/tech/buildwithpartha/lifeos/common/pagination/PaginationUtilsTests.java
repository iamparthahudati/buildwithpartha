package tech.buildwithpartha.lifeos.common.pagination;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;

class PaginationUtilsTests {

  private static final Set<String> ALLOWED_SORT = Set.of("createdAt", "updatedAt", "title");

  @Test
  @DisplayName("validate accepts valid pagination and sort parameters")
  void validateValidParameters() {
    PaginationParams params = PaginationUtils.validate(0, 20, ALLOWED_SORT, "title", "ASC");

    assertThat(params.page()).isEqualTo(0);
    assertThat(params.size()).isEqualTo(20);
    assertThat(params.sortBy()).isEqualTo("title");
    assertThat(params.sortDirection()).isEqualTo("ASC");
    assertThat(params.isAscending()).isTrue();
  }

  @Test
  @DisplayName("validate defaults null sortDirection to DESC")
  void validateDefaultsSortDirection() {
    PaginationParams params = PaginationUtils.validate(1, 50, ALLOWED_SORT, "createdAt", null);

    assertThat(params.page()).isEqualTo(1);
    assertThat(params.size()).isEqualTo(50);
    assertThat(params.sortDirection()).isEqualTo("DESC");
    assertThat(params.isAscending()).isFalse();
  }

  @Test
  @DisplayName("validate handles null sortBy and null allowedSortFields")
  void validateNullSortByAndAllowedSortFields() {
    PaginationParams params = PaginationUtils.validate(0, 20, null, null, "DESC");
    assertThat(params.sortBy()).isNull();
    assertThat(params.sortDirection()).isEqualTo("DESC");
  }

  @Test
  @DisplayName("validate throws FieldValidationException for negative page")
  void validateNegativePage() {
    assertThatThrownBy(() -> PaginationUtils.validate(-1, 20, ALLOWED_SORT, "title", "ASC"))
        .isInstanceOf(FieldValidationException.class)
        .satisfies(
            ex -> {
              FieldValidationException fve = (FieldValidationException) ex;
              assertThat(fve.errors())
                  .anyMatch(p -> p.field().equals("page") && p.code().equals("INVALID"));
            });
  }

  @Test
  @DisplayName("validate throws FieldValidationException for invalid size")
  void validateInvalidSize() {
    assertThatThrownBy(() -> PaginationUtils.validate(0, 0, ALLOWED_SORT, "title", "ASC"))
        .isInstanceOf(FieldValidationException.class)
        .satisfies(
            ex -> {
              FieldValidationException fve = (FieldValidationException) ex;
              assertThat(fve.errors())
                  .anyMatch(p -> p.field().equals("size") && p.code().equals("INVALID"));
            });

    assertThatThrownBy(() -> PaginationUtils.validate(0, 101, ALLOWED_SORT, "title", "ASC"))
        .isInstanceOf(FieldValidationException.class)
        .satisfies(
            ex -> {
              FieldValidationException fve = (FieldValidationException) ex;
              assertThat(fve.errors())
                  .anyMatch(p -> p.field().equals("size") && p.code().equals("INVALID"));
            });
  }

  @Test
  @DisplayName("validate throws FieldValidationException for unapproved sortBy field")
  void validateInvalidSortBy() {
    assertThatThrownBy(() -> PaginationUtils.validate(0, 20, ALLOWED_SORT, "unknownField", "ASC"))
        .isInstanceOf(FieldValidationException.class)
        .satisfies(
            ex -> {
              FieldValidationException fve = (FieldValidationException) ex;
              assertThat(fve.errors())
                  .anyMatch(p -> p.field().equals("sortBy") && p.code().equals("INVALID"));
            });
  }

  @Test
  @DisplayName("validate throws FieldValidationException for invalid sortDirection")
  void validateInvalidSortDirection() {
    assertThatThrownBy(() -> PaginationUtils.validate(0, 20, ALLOWED_SORT, "title", "INVALID_DIR"))
        .isInstanceOf(FieldValidationException.class)
        .satisfies(
            ex -> {
              FieldValidationException fve = (FieldValidationException) ex;
              assertThat(fve.errors())
                  .anyMatch(p -> p.field().equals("sortDirection") && p.code().equals("INVALID"));
            });
  }

  @Test
  @DisplayName("PaginationParams direct construction validates invariants")
  void paginationParamsInvariants() {
    assertThatThrownBy(() -> new PaginationParams(-1, 20, "title", "ASC"))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new PaginationParams(0, 0, "title", "ASC"))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new PaginationParams(0, 101, "title", "ASC"))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new PaginationParams(0, 20, "title", "BAD"))
        .isInstanceOf(IllegalArgumentException.class);

    PaginationParams validAsc = new PaginationParams(0, 20, "title", "ASC");
    assertThat(validAsc.isAscending()).isTrue();

    PaginationParams validDesc = new PaginationParams(0, 20, "title", "DESC");
    assertThat(validDesc.isAscending()).isFalse();
  }

  @Test
  @DisplayName("validatePageAndSize validates bounds correctly")
  void validatePageAndSizeBounds() {
    PaginationParams params = PaginationUtils.validatePageAndSize(2, 25);
    assertThat(params.page()).isEqualTo(2);
    assertThat(params.size()).isEqualTo(25);
  }

  @Test
  @DisplayName("applyStableSort configures CriteriaQuery ordering correctly for ASC and DESC")
  void applyStableSortConfiguresQuery() {
    @SuppressWarnings("unchecked")
    CriteriaBuilder cb = mock(CriteriaBuilder.class);
    @SuppressWarnings("unchecked")
    CriteriaQuery<Object> cq = mock(CriteriaQuery.class);
    @SuppressWarnings("unchecked")
    Root<Object> root = mock(Root.class);
    @SuppressWarnings("unchecked")
    Path<Object> titlePath = mock(Path.class);
    @SuppressWarnings("unchecked")
    Path<Object> idPath = mock(Path.class);
    Order primaryOrder = mock(Order.class);
    Order secondaryOrder = mock(Order.class);

    when(root.get("title")).thenReturn(titlePath);
    when(root.get("id")).thenReturn(idPath);
    when(cb.asc(titlePath)).thenReturn(primaryOrder);
    when(cb.desc(idPath)).thenReturn(secondaryOrder);

    PaginationUtils.applyStableSort(cb, cq, root, "title", "ASC", ALLOWED_SORT, "updatedAt");

    verify(cq).orderBy(primaryOrder, secondaryOrder);
  }

  @Test
  @DisplayName("applyStableSort falls back to defaultSortBy when sortBy is unapproved or null")
  void applyStableSortFallback() {
    @SuppressWarnings("unchecked")
    CriteriaBuilder cb = mock(CriteriaBuilder.class);
    @SuppressWarnings("unchecked")
    CriteriaQuery<Object> cq = mock(CriteriaQuery.class);
    @SuppressWarnings("unchecked")
    Root<Object> root = mock(Root.class);
    @SuppressWarnings("unchecked")
    Path<Object> defaultPath = mock(Path.class);
    @SuppressWarnings("unchecked")
    Path<Object> idPath = mock(Path.class);
    Order primaryOrder = mock(Order.class);
    Order secondaryOrder = mock(Order.class);

    when(root.get("updatedAt")).thenReturn(defaultPath);
    when(root.get("id")).thenReturn(idPath);
    when(cb.desc(defaultPath)).thenReturn(primaryOrder);
    when(cb.desc(idPath)).thenReturn(secondaryOrder);

    PaginationUtils.applyStableSort(
        cb, cq, root, "invalidField", "DESC", ALLOWED_SORT, "updatedAt");

    verify(cq).orderBy(primaryOrder, secondaryOrder);
  }
}
