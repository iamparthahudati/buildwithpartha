import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useRecentSearches } from "../hooks/useRecentSearches";

describe("useRecentSearches", () => {
  const userId = "test-user-123";

  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty and adds recent queries", () => {
    const { result } = renderHook(() => useRecentSearches({ userId }));

    expect(result.current.recents).toEqual([]);

    act(() => {
      result.current.addRecent("alpha");
    });

    expect(result.current.recents).toHaveLength(1);
    expect(result.current.recents[0]?.query).toBe("alpha");
  });

  it("deduplicates recent queries and moves latest to top", () => {
    const { result } = renderHook(() => useRecentSearches({ userId }));

    act(() => {
      result.current.addRecent("alpha");
      result.current.addRecent("beta");
      result.current.addRecent("alpha");
    });

    expect(result.current.recents).toHaveLength(2);
    expect(result.current.recents[0]?.query).toBe("alpha");
    expect(result.current.recents[1]?.query).toBe("beta");
  });

  it("removes individual recents and clears all recents", () => {
    const { result } = renderHook(() => useRecentSearches({ userId }));

    act(() => {
      result.current.addRecent("one");
      result.current.addRecent("two");
    });

    const firstId = result.current.recents[0]?.id;
    expect(firstId).toBeDefined();

    if (firstId) {
      act(() => {
        result.current.removeRecent(firstId);
      });
    }

    expect(result.current.recents).toHaveLength(1);
    expect(result.current.recents[0]?.query).toBe("one");

    act(() => {
      result.current.clearRecents();
    });

    expect(result.current.recents).toEqual([]);
  });
});
