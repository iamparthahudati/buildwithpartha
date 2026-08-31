import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { SearchScreen, type SearchEntityType, SEARCH_ENTITY_TYPES } from "@features/search";
import { useAuthSession } from "@state/authSession";

export function SearchRoute() {
  const { user } = useAuthSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q") ?? "";
  const typeParam = searchParams.get("type");
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const type: SearchEntityType | undefined =
    typeParam && SEARCH_ENTITY_TYPES.includes(typeParam as SearchEntityType)
      ? (typeParam as SearchEntityType)
      : undefined;

  const [isOnline, setIsOnline] = useState(() =>
    typeof window !== "undefined" ? window.navigator.onLine : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleQueryChange = (nextQuery: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (nextQuery.trim()) {
          next.set("q", nextQuery);
        } else {
          next.delete("q");
        }
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  const handleTypeChange = (nextType?: SearchEntityType) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (nextType) {
          next.set("type", nextType);
        } else {
          next.delete("type");
        }
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  const handlePageChange = (nextPage: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextPage > 1) {
        next.set("page", String(nextPage));
      } else {
        next.delete("page");
      }
      return next;
    });
  };

  return (
    <SearchScreen
      query={query}
      type={type}
      page={page}
      onQueryChange={handleQueryChange}
      onTypeChange={handleTypeChange}
      onPageChange={handlePageChange}
      onNavigateToItem={(href) => navigate(href)}
      userId={user?.id}
      isOnline={isOnline}
      locale={user?.locale ?? "en-US"}
    />
  );
}
