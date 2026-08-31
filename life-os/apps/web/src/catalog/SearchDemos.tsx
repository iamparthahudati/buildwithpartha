import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SearchScreen, type SearchEntityType } from "@features/search";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

export function SearchScreenDemo() {
  const [query, setQuery] = useState("project");
  const [type, setType] = useState<SearchEntityType | undefined>(undefined);
  const [page, setPage] = useState(1);

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: "1rem" }}>
        <SearchScreen
          query={query}
          type={type}
          page={page}
          onQueryChange={setQuery}
          onTypeChange={setType}
          onPageChange={setPage}
          onNavigateToItem={(href) => {
            window.alert(`Navigating to ${href}`);
          }}
          userId="demo-user"
          isOnline={true}
        />
      </div>
    </QueryClientProvider>
  );
}

export function SearchScreenEmptyDemo() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchEntityType | undefined>(undefined);

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: "1rem" }}>
        <SearchScreen
          query={query}
          type={type}
          page={1}
          onQueryChange={setQuery}
          onTypeChange={setType}
          onPageChange={() => {}}
          onNavigateToItem={() => {}}
          userId="demo-user"
          isOnline={true}
        />
      </div>
    </QueryClientProvider>
  );
}
