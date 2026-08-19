import { useLocation } from "react-router-dom";

import { Heading, Text } from "@components/ui";
import { resolveRouteTitle } from "@components/navigation";

/**
 * ComingSoonRoute (LOS-0603).
 *
 * Every canonical protected route from `23-NAVIGATION-AND-ROUTES.md` that a
 * later ticket (LOS-0608 onward) has not built a real screen for yet uses
 * this element. `12-CONTENT-TONE-GUIDE.md`'s original-fixture-data rule
 * rules out inventing sample tasks/projects/anything to make an unbuilt
 * screen look finished; this says plainly that it is not built, the same
 * honest stance `App.tsx`'s own former placeholder took. `resolveRouteTitle`
 * — the same lookup `AppShell` uses for `TopBar`'s context label and the
 * route-change announcement — keeps this route's own heading in agreement
 * with the sidebar entry that led here, rather than a second, divergent
 * title.
 */
export function ComingSoonRoute() {
  const location = useLocation();
  const title = resolveRouteTitle(location.pathname);

  return (
    <div className="lifeos-coming-soon-route">
      <Heading level={1}>{title}</Heading>
      <Text tone="secondary">This screen has not been built yet.</Text>
    </div>
  );
}
