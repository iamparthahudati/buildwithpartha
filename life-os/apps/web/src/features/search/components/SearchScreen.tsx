import { useMemo } from "react";
import { Clock, X } from "lucide-react";

import { Badge, Button, CountBadge, Icon, IconButton, Spinner, Text } from "@components/ui";
import { EmptyState, InlineMessage } from "@components/feedback";
import { PageHeader, Pagination } from "@components/navigation";
import { SearchField } from "@components/forms";
import { formatLocalDate } from "@lib/localDateTime";

import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { useRecentSearches } from "../hooks/useRecentSearches";
import {
  SEARCH_ENTITY_TYPES,
  type RecentSearch,
  type SearchEntityType,
  type SearchResultItem,
} from "../model/search";
import {
  getSearchEntityIcon,
  getSearchEntityLabel,
  getSearchEntitySingularLabel,
} from "../model/searchHelpers";
import { renderSafeHighlightedText } from "../model/renderHighlight";

import "./search-screen.css";

export interface SearchScreenProps {
  readonly query: string;
  readonly type?: SearchEntityType | undefined;
  readonly page?: number | undefined;
  readonly onQueryChange: (query: string) => void;
  readonly onTypeChange: (type?: SearchEntityType | undefined) => void;
  readonly onPageChange: (page: number) => void;
  readonly onNavigateToItem: (href: string) => void;
  readonly userId?: string | undefined;
  readonly isOnline?: boolean | undefined;
  readonly locale?: string | undefined;
}

export function SearchScreen({
  query,
  type,
  page = 1,
  onQueryChange,
  onTypeChange,
  onPageChange,
  onNavigateToItem,
  userId,
  isOnline = true,
  locale = "en-US",
}: SearchScreenProps) {
  const { recents, addRecent, removeRecent, clearRecents } = useRecentSearches({ userId });

  const searchParams = useMemo(
    () => ({
      q: query,
      type,
      page: page - 1, // backend is 0-indexed
      size: 20,
    }),
    [query, type, page],
  );

  const { data, isLoading, isError } = useGlobalSearch(searchParams, isOnline);

  const handleResultClick = (item: SearchResultItem) => {
    addRecent(query, { href: item.href, title: item.title, type: item.type });
    onNavigateToItem(item.href);
  };

  const handleRecentClick = (recent: RecentSearch) => {
    if (recent.targetHref) {
      onNavigateToItem(recent.targetHref);
    } else if (recent.query) {
      onQueryChange(recent.query);
    }
  };

  const totalItems = data?.totalItems ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const counts = data?.counts ?? {};

  const showRecents = !query.trim() && !type && recents.length > 0;
  const showEmptyPrompt = !query.trim() && !type && recents.length === 0;

  return (
    <div className="lifeos-search-screen">
      <PageHeader
        title="Search"
        description="Search across all your projects, tasks, notes, brain dump items, goals, and habits."
      />

      {!isOnline ? (
        <InlineMessage tone="warning">
          Offline mode: Search requires an active network connection to query server records.
        </InlineMessage>
      ) : null}

      <div className="lifeos-search-screen__search-bar">
        <SearchField
          value={query}
          onValueChange={onQueryChange}
          onSearch={(q) => onQueryChange(q)}
          placeholder="Type to search projects, tasks, notes, goals, habits…"
          label="Search LifeOS"
        />

        <div
          className="lifeos-search-screen__filters"
          role="toolbar"
          aria-label="Filter search results by type"
        >
          <button
            type="button"
            className={["lifeos-search-screen__filter-btn", type === undefined && "is-active"]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onTypeChange(undefined)}
          >
            All
            {data ? (
              <CountBadge
                count={Object.values(counts).reduce((acc, c) => acc + c, 0)}
                label="total count"
              />
            ) : null}
          </button>

          {SEARCH_ENTITY_TYPES.map((entityType) => {
            const label = getSearchEntityLabel(entityType);
            const count = counts[entityType] ?? 0;
            const IconComp = getSearchEntityIcon(entityType);

            return (
              <button
                key={entityType}
                type="button"
                className={["lifeos-search-screen__filter-btn", type === entityType && "is-active"]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onTypeChange(type === entityType ? undefined : entityType)}
              >
                <Icon icon={IconComp} decorative size="sm" />
                {label}
                {data && count > 0 ? <CountBadge count={count} label={`${label} count`} /> : null}
              </button>
            );
          })}
        </div>
      </div>

      {showRecents ? (
        <div className="lifeos-search-screen__recents">
          <div className="lifeos-search-screen__recents-header">
            <Text weight="medium" size="sm">
              Recent searches
            </Text>
            <Button variant="ghost" size="sm" onClick={clearRecents}>
              Clear recent searches
            </Button>
          </div>
          <ul className="lifeos-search-screen__recents-list">
            {recents.map((item) => {
              const EntityIcon = item.targetType ? getSearchEntityIcon(item.targetType) : Clock;
              return (
                <li key={item.id} className="lifeos-search-screen__recent-item">
                  <button
                    type="button"
                    className="lifeos-search-screen__recent-link"
                    onClick={() => handleRecentClick(item)}
                  >
                    <Icon icon={EntityIcon} decorative size="sm" />
                    <span>{item.targetTitle || item.query}</span>
                    {item.targetType ? (
                      <Badge tone="neutral">{getSearchEntitySingularLabel(item.targetType)}</Badge>
                    ) : null}
                  </button>
                  <IconButton
                    icon={X}
                    label={`Remove recent search ${item.targetTitle || item.query}`}
                    variant="ghost"
                    onClick={() => removeRecent(item.id)}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {showEmptyPrompt ? (
        <EmptyState
          variant="search"
          title="Search your workspace"
          description="Type a search query above or filter by entity type to find tasks, projects, notes, and more."
        />
      ) : null}

      {isLoading ? (
        <div className="lifeos-search-screen__loading">
          <Spinner label="Searching workspace…" size="lg" />
        </div>
      ) : null}

      {isError ? (
        <InlineMessage tone="danger">
          Unable to load search results: An error occurred while fetching global search results.
          Please try again.
        </InlineMessage>
      ) : null}

      {!isLoading && !isError && (query.trim() || type) && totalItems === 0 ? (
        <EmptyState
          variant="search"
          title="No results found"
          description={
            query.trim()
              ? `No matching records found for "${query}". Try adjusting your query or filters.`
              : "No records found for the selected entity type."
          }
        />
      ) : null}

      {!isLoading && !isError && data && totalItems > 0 ? (
        <div className="lifeos-search-screen__results">
          {!type && data.groups.length > 0 ? (
            // Grouped view when searching across all entity types
            data.groups.map((group) => {
              const GroupIcon = getSearchEntityIcon(group.type);
              const groupLabel = getSearchEntityLabel(group.type);

              return (
                <section key={group.type} className="lifeos-search-screen__group">
                  <div className="lifeos-search-screen__group-header">
                    <div className="lifeos-search-screen__group-title">
                      <Icon icon={GroupIcon} decorative size="sm" />
                      <Text weight="semibold">{groupLabel}</Text>
                      <CountBadge count={group.totalItems} label={`${groupLabel} count`} />
                    </div>
                    {group.totalItems > group.items.length ? (
                      <Button variant="ghost" size="sm" onClick={() => onTypeChange(group.type)}>
                        View all {groupLabel} ({group.totalItems})
                      </Button>
                    ) : null}
                  </div>

                  <ul className="lifeos-search-screen__item-list">
                    {group.items.map((item) => (
                      <SearchResultCard
                        key={item.id}
                        item={item}
                        locale={locale}
                        onClick={() => handleResultClick(item)}
                      />
                    ))}
                  </ul>
                </section>
              );
            })
          ) : (
            // Flat paginated view when entity type filter is active
            <ul className="lifeos-search-screen__item-list">
              {data.items.map((item) => (
                <SearchResultCard
                  key={item.id}
                  item={item}
                  locale={locale}
                  onClick={() => handleResultClick(item)}
                />
              ))}
            </ul>
          )}

          {totalPages > 1 ? (
            <Pagination
              page={page}
              pageSize={20}
              total={totalItems}
              onPageChange={onPageChange}
              label="Search results pagination"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface SearchResultCardProps {
  readonly item: SearchResultItem;
  readonly locale: string;
  readonly onClick: () => void;
}

function SearchResultCard({ item, locale, onClick }: SearchResultCardProps) {
  const IconComp = getSearchEntityIcon(item.type);
  const typeLabel = getSearchEntitySingularLabel(item.type);

  const formattedDate = useMemo(() => {
    try {
      const d = new Date(item.updatedAt);
      return formatLocalDate(d.toISOString().substring(0, 10), locale);
    } catch {
      return item.updatedAt;
    }
  }, [item.updatedAt, locale]);

  return (
    <li>
      <a
        href={item.href}
        className="lifeos-search-card"
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
      >
        <div className="lifeos-search-card__header">
          <div className="lifeos-search-card__title-row">
            <Icon icon={IconComp} decorative size="sm" />
            <span className="lifeos-search-card__title">
              {renderSafeHighlightedText(item.title)}
            </span>
          </div>
          <Badge tone="neutral">{typeLabel}</Badge>
        </div>

        {item.snippet ? (
          <p className="lifeos-search-card__snippet">{renderSafeHighlightedText(item.snippet)}</p>
        ) : null}

        <Text tone="secondary" size="xs">
          Updated {formattedDate}
        </Text>
      </a>
    </li>
  );
}
