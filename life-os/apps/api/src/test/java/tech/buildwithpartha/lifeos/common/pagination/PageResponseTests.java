package tech.buildwithpartha.lifeos.common.pagination;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class PageResponseTests {

  @Test
  void calculatesPaginationMetadata() {
    PageResponse<String> response = PageResponse.of(List.of("first", "second"), 1, 2, 5);

    assertThat(response.items()).containsExactly("first", "second");
    assertThat(response.page()).isEqualTo(1);
    assertThat(response.size()).isEqualTo(2);
    assertThat(response.totalItems()).isEqualTo(5);
    assertThat(response.totalPages()).isEqualTo(3);
  }

  @Test
  void copiesItemsToKeepTheResponseImmutable() {
    List<String> items = new ArrayList<>(List.of("first"));
    PageResponse<String> response = PageResponse.of(items, 0, 10, 1);

    items.add("second");

    assertThat(response.items()).containsExactly("first");
    assertThatThrownBy(() -> response.items().add("third"))
        .isInstanceOf(UnsupportedOperationException.class);
  }

  @Test
  void rejectsInconsistentPaginationMetadata() {
    assertThatThrownBy(() -> new PageResponse<>(List.of("first"), 0, 10, 1, 2))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("totalPages");
    assertThatThrownBy(() -> PageResponse.of(List.of("first"), -1, 10, 1))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("page");
    assertThatThrownBy(() -> new PageResponse<>(List.of("first"), 0, 0, 1, 1))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("size");
    assertThatThrownBy(() -> PageResponse.of(List.of("first"), 0, 0, 1))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("size");
  }

  @Test
  void rejectsInvalidItemAndTotalCounts() {
    assertThatNullPointerException()
        .isThrownBy(() -> PageResponse.of(null, 0, 10, 0))
        .withMessage("items must not be null");
    assertThatThrownBy(() -> PageResponse.of(List.of("first", "second"), 0, 1, 2))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("more entries than size");
    assertThatThrownBy(() -> PageResponse.of(List.of("first"), 0, 10, 0))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("totalItems");
    assertThatThrownBy(() -> PageResponse.of(List.of(), 0, 10, -1))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("zero or greater");
  }

  @Test
  void handlesEmptyAndUnrepresentablyLargePageCounts() {
    PageResponse<String> empty = PageResponse.of(List.of(), 0, 10, 0);

    assertThat(empty.totalPages()).isZero();
    assertThatThrownBy(() -> PageResponse.of(List.of(), 0, 1, Long.MAX_VALUE))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("32-bit integer");
  }
}
