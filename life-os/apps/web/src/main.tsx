import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@app/App";
import { readPublicEnvironment } from "@app/environment";
import "@styles/global.css";

readPublicEnvironment();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("LifeOS could not find its application root.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
