import { useMemo, useState, type CSSProperties } from "react";

import { CATALOG_ENTRIES } from "./entries";
import { assertRegistryIsValid, findEntry, groupEntries, type CatalogEntry } from "./registry";
import {
  CATALOG_VIEWPORTS,
  DEFAULT_VIEWPORT_ID,
  findViewport,
  viewportWidthStyle,
} from "./viewports";

interface CatalogAppProps {
  readonly entries?: readonly CatalogEntry[];
}

export function CatalogApp({ entries = CATALOG_ENTRIES }: CatalogAppProps) {
  assertRegistryIsValid(entries);

  const [selectedEntryId, setSelectedEntryId] = useState(entries[0]?.id ?? "");
  const [viewportId, setViewportId] = useState(DEFAULT_VIEWPORT_ID);

  const groups = useMemo(() => groupEntries(entries), [entries]);
  const entry = findEntry(entries, selectedEntryId) ?? entries[0];
  const viewport = findViewport(viewportId);

  return (
    <div className="catalog">
      <header className="catalog__header">
        <p className="catalog__eyebrow">LifeOS</p>
        <h1>Component catalog</h1>
        <p className="catalog__note">
          Development tool. It is never built for production and is not part of the LifeOS
          application.
        </p>
      </header>

      <div className="catalog__body">
        <nav className="catalog__nav" aria-label="Catalog entries">
          {groups.map(({ group, entries: groupedEntries }) => (
            <section key={group}>
              <h2 className="catalog__group">{group}</h2>
              <ul className="catalog__list">
                {groupedEntries.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      className="catalog__link"
                      aria-current={candidate.id === entry?.id ? "true" : undefined}
                      onClick={() => setSelectedEntryId(candidate.id)}
                    >
                      {candidate.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>

        <main className="catalog__main">
          <fieldset className="catalog__viewports">
            <legend>Viewport</legend>
            {CATALOG_VIEWPORTS.map((candidate) => (
              <label key={candidate.id} className="catalog__viewport">
                <input
                  type="radio"
                  name="catalog-viewport"
                  value={candidate.id}
                  checked={candidate.id === viewportId}
                  onChange={() => setViewportId(candidate.id)}
                />
                {candidate.name}
              </label>
            ))}
            <p className="catalog__note">{viewport.description}</p>
          </fieldset>

          {entry ? (
            <article aria-labelledby="catalog-entry-title">
              <h2 id="catalog-entry-title">{entry.name}</h2>
              <p className="catalog__summary">{entry.summary}</p>

              {entry.states.map((state) => (
                <section key={state.id} className="catalog__state">
                  <h3>{state.name}</h3>
                  <p className="catalog__note">{state.description}</p>
                  <div
                    className="catalog__stage"
                    data-testid={`stage-${state.id}`}
                    // A custom property keeps the width rule in CSS; the stage
                    // only supplies the value the selected viewport implies.
                    style={
                      { "--catalog-stage-width": viewportWidthStyle(viewport) } as CSSProperties
                    }
                  >
                    {state.render()}
                  </div>
                </section>
              ))}
            </article>
          ) : null}
        </main>
      </div>
    </div>
  );
}
