import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@styles/global.css";

import { CatalogApp } from "./CatalogApp";
import "./catalog.css";

/*
 * The catalog is excluded from every production build: `catalog.html` is not a
 * Rollup input, so no catalog module reaches `dist/`. This runtime guard is the
 * second line of defense — if the entry is ever bundled by mistake, it refuses
 * to mount rather than exposing a development tool to real users.
 */
if (!import.meta.env.DEV) {
  throw new Error("The LifeOS component catalog is a development-only tool.");
}

const rootElement = document.getElementById("catalog-root");

if (!rootElement) {
  throw new Error("LifeOS could not find the catalog root.");
}

createRoot(rootElement).render(
  <StrictMode>
    <CatalogApp />
  </StrictMode>,
);
