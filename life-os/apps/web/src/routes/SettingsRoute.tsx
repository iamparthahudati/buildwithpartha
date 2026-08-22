import { useNavigate, useParams } from "react-router-dom";

import { SettingsScreen } from "@features/settings";

/**
 * SettingsRoute (LOS-0603).
 *
 * Mounts LOS-0515/LOS-0516/LOS-0519's `SettingsScreen` at
 * `/life-os/app/settings/:section?`, wiring its `initialSection`/
 * `onSectionChange` contract to the URL param so the active section is a
 * real, shareable/back-button-able route, not component-local state.
 */
export function SettingsRoute() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();

  return (
    <SettingsScreen
      {...(section ? { initialSection: section } : {})}
      onSectionChange={(nextSection) => navigate(`/life-os/app/settings/${nextSection}`)}
    />
  );
}
