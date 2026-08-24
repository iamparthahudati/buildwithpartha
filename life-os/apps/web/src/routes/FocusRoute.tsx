import { useSearchParams } from "react-router-dom";

import { IntegratedFocusMode } from "@features/focus";
import { useAuthSession } from "@state/authSession";

export function FocusRoute() {
  const { user } = useAuthSession();
  const [searchParams] = useSearchParams();
  if (user === null) return null;

  const taskId = searchParams.get("taskId") ?? undefined;
  const timeBlockId = searchParams.get("timeBlockId") ?? undefined;
  return (
    <IntegratedFocusMode
      locale={user.locale}
      {...(taskId ? { taskId } : {})}
      {...(timeBlockId ? { timeBlockId } : {})}
    />
  );
}
