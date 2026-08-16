package tech.buildwithpartha.lifeos.common.pagination;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class PageResponseTests {

    @Test
    void calculatesPaginationMetadata() {
        PageResponse<String> response = PageResponse.of(List.of("first", "second"), 1, 2, 5);

        assertEquals(List.of("first", "second"), response.items());
        assertEquals(1, response.page());
        assertEquals(2, response.size());
        assertEquals(5, response.totalItems());
        assertEquals(3, response.totalPages());
    }

    @Test
    void copiesItemsToKeepTheResponseImmutable() {
        List<String> items = new ArrayList<>(List.of("first"));
        PageResponse<String> response = PageResponse.of(items, 0, 10, 1);

        items.add("second");

        assertEquals(List.of("first"), response.items());
        assertThrows(UnsupportedOperationException.class, () -> response.items().add("third"));
    }

    @Test
    void rejectsInconsistentPaginationMetadata() {
        assertThrows(
                IllegalArgumentException.class,
                () -> new PageResponse<>(List.of("first"), 0, 10, 1, 2));
        assertThrows(
                IllegalArgumentException.class,
                () -> PageResponse.of(List.of("first"), -1, 10, 1));
        assertThrows(
                IllegalArgumentException.class,
                () -> PageResponse.of(List.of("first"), 0, 0, 1));
    }
}
