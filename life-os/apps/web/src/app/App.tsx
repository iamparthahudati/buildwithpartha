import { AppProviders } from "./AppProviders";
import { AppRouter } from "./AppRouter";

/**
 * App (LOS-0603).
 *
 * Replaces LOS-0201's temporary foundation view: every provider
 * (`AppProviders`) and the complete route table (`AppRouter`) now exist and
 * compose here.
 */
export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
