import { useLocation } from "react-router-dom";

export function RouterLocationProbe() {
  const location = useLocation();
  return <output aria-label="location">{`${location.pathname}${location.search}`}</output>;
}
