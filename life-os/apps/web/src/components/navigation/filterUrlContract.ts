/**
 * The URL serialization contract for a filter set (LOS-0420).
 *
 * `FilterBar` itself has no domain filters — what a screen filters by
 * (status, assignee, a date range) is entirely the caller's, matching the
 * "no domain columns hardcoded" principle `DataTable`'s own ticket states.
 * What every screen with filters still needs is the *same* answer to one
 * question: how does a filter set round-trip through a URL's query string?
 * These two pure functions are that contract — symmetric, and independently
 * testable without touching `window.location` or a router, the same
 * "pure core, thin wiring" shape `menuPosition.ts`/`breadcrumbsCollapse.ts`
 * already use. Wiring them to `history.pushState`/`popstate` for a live,
 * multi-value equivalent of `useDeepLinkParam` (LOS-0414) is deliberately
 * left to the caller — this ticket defines the shape of the round-trip, not
 * a second hook.
 */

export type FilterValue = string | readonly string[];
export type FilterState = Readonly<Record<string, FilterValue | undefined>>;

/**
 * An empty string and `undefined` both mean "not set" and are omitted, so a
 * cleared filter drops its key from the URL entirely rather than leaving
 * `?status=` behind. An array serializes as one repeated key
 * (`?label=a&label=b`), the same shape `URLSearchParams.getAll` expects back.
 */
export function serializeFilters(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
    } else if (value !== "") {
      params.set(key, value as string);
    }
  }

  return params;
}

/**
 * The inverse of `serializeFilters`. `multiValueKeys` names which keys read
 * back as an array via `getAll` rather than a single value via `get` — the
 * caller must say which, since `URLSearchParams` alone cannot distinguish
 * "never set" from "set to one value" for a key that is allowed several.
 */
export function parseFilters(
  searchParams: URLSearchParams,
  keys: readonly string[],
  multiValueKeys: readonly string[] = [],
): FilterState {
  const result: Record<string, FilterValue> = {};

  for (const key of keys) {
    if (multiValueKeys.includes(key)) {
      const values = searchParams.getAll(key);
      if (values.length > 0) {
        result[key] = values;
      }
      continue;
    }

    const value = searchParams.get(key);
    if (value !== null) {
      result[key] = value;
    }
  }

  return result;
}
