import type { ReactNode } from "react";

/**
 * The catalog is the development-only surface where every component and every
 * one of its states is visible at once. Entries are registered here rather than
 * discovered, so a state that is not registered is visibly missing rather than
 * silently untested.
 */

export interface CatalogState {
  /** Stable within its entry; used for the state's anchor and test queries. */
  readonly id: string;
  readonly name: string;
  /** What this state means and when a component enters it. */
  readonly description: string;
  readonly render: () => ReactNode;
}

export interface CatalogEntry {
  /** Stable across renames; used in the URL fragment. */
  readonly id: string;
  readonly name: string;
  /** Groups the sidebar. Foundations first, then atoms as their tickets land. */
  readonly group: string;
  readonly summary: string;
  readonly states: readonly CatalogState[];
}

export function findEntry(
  entries: readonly CatalogEntry[],
  entryId: string | undefined,
): CatalogEntry | undefined {
  return entries.find((entry) => entry.id === entryId);
}

/** Sidebar order: groups keep registration order, entries sort inside a group. */
export function groupEntries(
  entries: readonly CatalogEntry[],
): readonly { group: string; entries: readonly CatalogEntry[] }[] {
  const groups: { group: string; entries: CatalogEntry[] }[] = [];

  for (const entry of entries) {
    const existing = groups.find((candidate) => candidate.group === entry.group);
    if (existing) {
      existing.entries.push(entry);
    } else {
      groups.push({ group: entry.group, entries: [entry] });
    }
  }

  return groups;
}

/**
 * Fails loudly on duplicate identifiers or an entry with no states. A catalog
 * that silently drops an entry would defeat its purpose as the completeness
 * check for the design system.
 */
export function assertRegistryIsValid(entries: readonly CatalogEntry[]): void {
  const problems: string[] = [];
  const seenEntryIds = new Set<string>();

  if (entries.length === 0) {
    problems.push("The catalog registry is empty.");
  }

  for (const entry of entries) {
    if (seenEntryIds.has(entry.id)) {
      problems.push(`Duplicate catalog entry id "${entry.id}".`);
    }
    seenEntryIds.add(entry.id);

    if (entry.states.length === 0) {
      problems.push(`Catalog entry "${entry.id}" registers no states.`);
    }

    const seenStateIds = new Set<string>();
    for (const state of entry.states) {
      if (seenStateIds.has(state.id)) {
        problems.push(`Duplicate state id "${state.id}" in catalog entry "${entry.id}".`);
      }
      seenStateIds.add(state.id);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid catalog registry:\n- ${problems.join("\n- ")}`);
  }
}
