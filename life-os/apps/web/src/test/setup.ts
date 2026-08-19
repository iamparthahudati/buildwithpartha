import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom does not implement `window.matchMedia` at all (it is simply
// undefined, not a stub that never matches). Every real browser has it, so
// any component built against it — `useMediaQuery` (LOS-0603) — would
// otherwise crash in every test that mounts it, even ones with no interest
// in responsive behavior. A test that does care overrides this with its own
// `vi.stubGlobal("matchMedia", ...)`.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
