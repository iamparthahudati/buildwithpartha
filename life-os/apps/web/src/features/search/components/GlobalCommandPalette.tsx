import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckSquare, Clock, FileText, Folder, Plus, Search, Settings, Sun } from "lucide-react";

import { CommandPalette, type CommandPaletteGroup } from "@components/feedback";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { useRecentSearches } from "../hooks/useRecentSearches";
import {
  getSearchEntityIcon,
  getSearchEntityLabel,
  getSearchEntitySingularLabel,
  stripHtmlMarkTags,
} from "../model/searchHelpers";
import type { SearchEntityType } from "../model/search";

export interface GlobalCommandPaletteProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly userId?: string | undefined;
  readonly onOpenQuickAdd?: (() => void) | undefined;
}

export function GlobalCommandPalette({
  open,
  onClose,
  userId,
  onOpenQuickAdd,
}: GlobalCommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { recents, addRecent } = useRecentSearches({ userId });

  const trimmedQuery = query.trim();
  const { data, isLoading } = useGlobalSearch(
    { q: trimmedQuery, size: 5 },
    open && Boolean(trimmedQuery),
  );

  const handleSelectRecent = useCallback(
    (href?: string, recentQuery?: string) => {
      if (href) {
        navigate(href);
        onClose();
      } else if (recentQuery) {
        setQuery(recentQuery);
      }
    },
    [navigate, onClose],
  );

  const handleFullSearch = useCallback(
    (searchQuery: string) => {
      const q = searchQuery.trim();
      if (!q) return;
      addRecent(q);
      navigate(`/life-os/app/search?q=${encodeURIComponent(q)}`);
      onClose();
    },
    [addRecent, navigate, onClose],
  );

  const groups: readonly CommandPaletteGroup[] = useMemo(() => {
    if (!trimmedQuery) {
      const recentsGroup: CommandPaletteGroup | null =
        recents.length > 0
          ? {
              id: "recents",
              heading: "Recent searches",
              items: recents.map((item) => {
                const IconComp = item.targetType ? getSearchEntityIcon(item.targetType) : Clock;
                const desc = item.targetType
                  ? getSearchEntitySingularLabel(item.targetType)
                  : "Search query";
                return {
                  id: item.id,
                  label: item.targetTitle || item.query,
                  description: desc,
                  icon: IconComp,
                  onSelect: () => handleSelectRecent(item.targetHref, item.query),
                };
              }),
            }
          : null;

      const actionsGroup: CommandPaletteGroup = {
        id: "quick-actions",
        heading: "Quick actions & navigation",
        items: [
          ...(onOpenQuickAdd
            ? [
                {
                  id: "action-quick-add",
                  label: "Quick add task",
                  icon: Plus,
                  shortcut: "Q",
                  onSelect: () => {
                    onClose();
                    onOpenQuickAdd();
                  },
                },
              ]
            : []),
          {
            id: "nav-today",
            label: "Go to Today",
            icon: Sun,
            onSelect: () => {
              onClose();
              navigate("/life-os/app/today");
            },
          },
          {
            id: "nav-tasks",
            label: "Go to Tasks",
            icon: CheckSquare,
            onSelect: () => {
              onClose();
              navigate("/life-os/app/tasks");
            },
          },
          {
            id: "nav-projects",
            label: "Go to Projects",
            icon: Folder,
            onSelect: () => {
              onClose();
              navigate("/life-os/app/projects");
            },
          },
          {
            id: "nav-notes",
            label: "Go to Notes",
            icon: FileText,
            onSelect: () => {
              onClose();
              navigate("/life-os/app/notes");
            },
          },
          {
            id: "nav-settings",
            label: "Go to Settings",
            icon: Settings,
            onSelect: () => {
              onClose();
              navigate("/life-os/app/settings");
            },
          },
        ],
      };

      return [recentsGroup, actionsGroup].filter((g): g is CommandPaletteGroup => g !== null);
    }

    // When query is non-empty
    const resultGroups: CommandPaletteGroup[] = (data?.groups ?? [])
      .filter((g) => g.items.length > 0)
      .map((group) => {
        const heading = getSearchEntityLabel(group.type as SearchEntityType);
        return {
          id: `group-${group.type}`,
          heading,
          items: group.items.map((item) => {
            const desc = stripHtmlMarkTags(item.snippet);
            return {
              id: item.id,
              label: stripHtmlMarkTags(item.title) || item.title,
              ...(desc ? { description: desc } : {}),
              icon: getSearchEntityIcon(item.type as SearchEntityType),
              onSelect: () => {
                addRecent(trimmedQuery, {
                  href: item.href,
                  title: item.title,
                  type: item.type as SearchEntityType,
                });
                navigate(item.href);
                onClose();
              },
            };
          }),
        };
      });

    const fullSearchGroup: CommandPaletteGroup = {
      id: "full-search-action",
      heading: "Search results",
      items: [
        {
          id: "view-all-results",
          label: `View all results for "${trimmedQuery}"`,
          icon: Search,
          shortcut: "↵",
          onSelect: () => handleFullSearch(trimmedQuery),
        },
      ],
    };

    return [...resultGroups, fullSearchGroup];
  }, [
    trimmedQuery,
    recents,
    data,
    navigate,
    onClose,
    onOpenQuickAdd,
    addRecent,
    handleSelectRecent,
    handleFullSearch,
  ]);

  return (
    <CommandPalette
      open={open}
      onClose={() => {
        setQuery("");
        onClose();
      }}
      query={query}
      onQueryChange={setQuery}
      onSearch={handleFullSearch}
      groups={groups}
      loading={isLoading}
      loadingLabel="Searching workspace…"
      placeholder="Type to search or run a command…"
      label="Global command palette"
    />
  );
}
