import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { IntegratedTaskDetails, type TaskDetailsTabId } from "@features/tasks";
import { isSafeReturnPath } from "@lib/returnPath";
import { useAuthSession } from "@state/authSession";
import { useToast } from "@state/toastQueue";

const TASK_DETAIL_TABS = new Set<TaskDetailsTabId>([
  "details",
  "subtasks",
  "dependencies",
  "comments",
  "attachments",
  "activity",
]);

function readTaskTab(value: string | null): TaskDetailsTabId {
  return value !== null && TASK_DETAIL_TABS.has(value as TaskDetailsTabId)
    ? (value as TaskDetailsTabId)
    : "details";
}

function readTaskListReturnPath(candidate: string | null): string {
  if (!isSafeReturnPath(candidate)) return "/life-os/app/tasks";
  const resolved = new URL(candidate, window.location.origin);
  return resolved.pathname === "/life-os/app/tasks" ? candidate : "/life-os/app/tasks";
}

export function TaskDetailsRoute() {
  const { taskId = "" } = useParams<{ taskId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const toast = useToast();

  if (user === null) return null;

  const backHref = readTaskListReturnPath(searchParams.get("returnTo"));
  const selectedTab = readTaskTab(searchParams.get("tab"));

  return (
    <IntegratedTaskDetails
      taskId={taskId}
      selectedTab={selectedTab}
      onTabChange={(tab) => {
        setSearchParams(
          (current) => {
            const next = new URLSearchParams(current);
            if (tab === "details") next.delete("tab");
            else next.set("tab", tab);
            return next;
          },
          { replace: true },
        );
      }}
      backHref={backHref}
      locale={user.locale}
      timeZone={user.timeZone}
      authorId={user.id}
      authorName={user.displayName}
      onNavigate={(href) => navigate(href)}
      onDeleted={() => navigate(backHref)}
      onMutationSuccess={(message) => toast.push({ tone: "success", message })}
    />
  );
}
