package tech.buildwithpartha.lifeos.common.pagination;

import java.util.List;
import java.util.Objects;

/**
 * Immutable zero-based page response used at API boundaries.
 *
 * @param items items in the requested page
 * @param page zero-based requested page number
 * @param size maximum number of items in a page
 * @param totalItems total matching items across every page
 * @param totalPages total number of pages, or zero when there are no matching items
 */
public record PageResponse<T>(
        List<T> items, int page, int size, long totalItems, int totalPages) {

    public PageResponse {
        items = List.copyOf(Objects.requireNonNull(items, "items must not be null"));
        if (page < 0) {
            throw new IllegalArgumentException("page must be zero or greater");
        }
        if (size < 1) {
            throw new IllegalArgumentException("size must be greater than zero");
        }
        if (items.size() > size) {
            throw new IllegalArgumentException("items must not contain more entries than size");
        }
        if (totalItems < items.size()) {
            throw new IllegalArgumentException("totalItems must not be smaller than items size");
        }

        int expectedTotalPages = totalPages(totalItems, size);
        if (totalPages != expectedTotalPages) {
            throw new IllegalArgumentException(
                    "totalPages must match totalItems and size; expected " + expectedTotalPages);
        }
    }

    public static <T> PageResponse<T> of(
            List<T> items, int page, int size, long totalItems) {
        return new PageResponse<>(items, page, size, totalItems, totalPages(totalItems, size));
    }

    private static int totalPages(long totalItems, int size) {
        if (totalItems < 0) {
            throw new IllegalArgumentException("totalItems must be zero or greater");
        }
        if (size < 1) {
            throw new IllegalArgumentException("size must be greater than zero");
        }
        long pages = totalItems == 0 ? 0 : ((totalItems - 1) / size) + 1;
        if (pages > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("totalPages must fit in a 32-bit integer");
        }
        return (int) pages;
    }
}
