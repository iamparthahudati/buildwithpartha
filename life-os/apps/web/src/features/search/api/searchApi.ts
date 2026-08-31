import { apiRequest } from "@lib/apiClient";
import type { SearchQueryParams, SearchResponse } from "../model/search";

/**
 * Executes a user-scoped global search request against GET /search (LOS-1302).
 */
export async function searchGlobal(
  params: SearchQueryParams = {},
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const query = new URLSearchParams();
  if (params.q !== undefined && params.q !== null && params.q !== "") {
    query.set("q", params.q);
  }
  if (params.types && params.types.length > 0) {
    query.set("types", params.types.join(","));
  }
  if (params.type) {
    query.set("type", params.type);
  }
  if (params.page !== undefined) {
    query.set("page", String(params.page));
  }
  if (params.size !== undefined) {
    query.set("size", String(params.size));
  }

  const queryString = query.toString();
  const path = `/search${queryString ? `?${queryString}` : ""}`;

  return apiRequest<SearchResponse>(path, signal ? { signal } : {});
}
