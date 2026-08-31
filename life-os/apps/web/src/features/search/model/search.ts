/**
 * Global search domain models (LOS-1302).
 */

export type SearchEntityType = "PROJECT" | "TASK" | "NOTE" | "BRAIN_DUMP" | "GOAL" | "HABIT";

export const SEARCH_ENTITY_TYPES: readonly SearchEntityType[] = [
  "PROJECT",
  "TASK",
  "NOTE",
  "BRAIN_DUMP",
  "GOAL",
  "HABIT",
] as const;

export interface SearchResultItem {
  readonly id: string;
  readonly type: SearchEntityType;
  readonly title: string;
  readonly snippet: string;
  readonly score: number;
  readonly updatedAt: string;
  readonly href: string;
}

export interface SearchGroup {
  readonly type: SearchEntityType;
  readonly totalItems: number;
  readonly items: readonly SearchResultItem[];
}

export interface SearchResponse {
  readonly query: string;
  readonly totalItems: number;
  readonly page: number;
  readonly size: number;
  readonly totalPages: number;
  readonly counts: Record<string, number>;
  readonly groups: readonly SearchGroup[];
  readonly items: readonly SearchResultItem[];
}

export interface SearchQueryParams {
  readonly q?: string | undefined;
  readonly types?: readonly SearchEntityType[] | undefined;
  readonly type?: SearchEntityType | undefined;
  readonly page?: number | undefined;
  readonly size?: number | undefined;
}

export interface RecentSearch {
  readonly id: string;
  readonly query: string;
  readonly timestamp: number;
  readonly targetHref?: string | undefined;
  readonly targetTitle?: string | undefined;
  readonly targetType?: SearchEntityType | undefined;
}
