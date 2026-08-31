import { useState } from "react";
import { SearchScreen, type SearchEntityType } from "@features/search";

export function SearchScreenDemo() {
  const [query, setQuery] = useState("project");
  const [type, setType] = useState<SearchEntityType | undefined>(undefined);
  const [page, setPage] = useState(1);

  return (
    <div style={{ padding: "1rem" }}>
      <SearchScreen
        query={query}
        type={type}
        page={page}
        onQueryChange={setQuery}
        onTypeChange={setType}
        onPageChange={setPage}
        onNavigateToItem={(href) => {
          // Demo alert or log
          window.alert(`Navigating to ${href}`);
        }}
        userId="demo-user"
        isOnline={true}
      />
    </div>
  );
}

export function SearchScreenEmptyDemo() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchEntityType | undefined>(undefined);

  return (
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
  );
}
