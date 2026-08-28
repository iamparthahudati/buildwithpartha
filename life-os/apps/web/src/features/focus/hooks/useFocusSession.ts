import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CALENDAR_QUERY_KEY } from "@features/calendar";
import { TASKS_QUERY_KEY } from "@features/tasks";
import { DAILY_TIME_SUMMARY_QUERY_KEY, TIME_BLOCKS_QUERY_KEY } from "@features/time-blocks";
import { TODAY_QUERY_KEY } from "@features/today";
import { ApiError } from "@lib/apiClient";

import {
  cancelSession,
  completeSession,
  getActiveSession,
  pauseSession,
  recordInterruption,
  resumeFocus,
  resumeSession,
  startBreak,
  startSession,
  type FocusSession,
  type FocusSessionTransition,
  type StartFocusSessionRequest,
} from "../api/focusApi";
import { calculateFocusSessionClock } from "../model/focusSessionClock";
import {
  publishFocusSessionChange,
  subscribeToFocusSessionChanges,
} from "../model/focusSessionSync";

export const FOCUS_SESSION_QUERY_KEY = ["focus-session", "active"] as const;
const FOCUS_SESSION_TERMINAL_QUERY_KEY = ["focus-session", "last-terminal"] as const;
const POLL_INTERVAL_MS = 30_000;
const TICK_INTERVAL_MS = 250;

export type FocusSessionAction =
  | "start"
  | "pause"
  | "resume"
  | "complete"
  | "cancel"
  | "skip-break"
  | "save-note"
  | "automatic-transition";

interface StartCommand {
  readonly action: "start";
  readonly request: StartFocusSessionRequest;
  readonly idempotencyKey: string;
}

interface SessionCommand {
  readonly action: Exclude<FocusSessionAction, "start">;
  readonly session: FocusSession;
  readonly note?: string;
}

type FocusCommand = StartCommand | SessionCommand;

const automaticTransitions = new Set<string>();
let fallbackKeySequence = 0;

function subscribeOnline(onStoreChange: () => void): () => void {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function readOnline(): boolean {
  return navigator.onLine;
}

function createIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  fallbackKeySequence += 1;
  return `focus-${Date.now().toString(36)}-${fallbackKeySequence.toString(36)}`;
}

function transitionCommand(session: FocusSession): FocusSessionTransition {
  return {
    sessionId: session.id,
    version: session.version,
    idempotencyKey: createIdempotencyKey(),
  };
}

function isReconciliationConflict(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) return false;
  return [
    "CONCURRENCY_CONFLICT",
    "FOCUS_SESSION_ALREADY_ACTIVE",
    "FOCUS_SESSION_STATE_CONFLICT",
  ].includes(error.problem?.code ?? "");
}

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 0) {
    return "The connection was interrupted, so no change was confirmed. Reconnect and try again.";
  }
  if (error instanceof ApiError && error.problem?.detail) return error.problem.detail;
  return "LifeOS could not confirm the change. Try again.";
}

export function useFocusSession() {
  const queryClient = useQueryClient();
  const online = useSyncExternalStore(subscribeOnline, readOnline, () => true);
  const [clientNowMs, setClientNowMs] = useState(0);
  const [message, setMessage] = useState<string | undefined>();

  const query = useQuery<FocusSession | null>({
    queryKey: FOCUS_SESSION_QUERY_KEY,
    queryFn: ({ signal }) => getActiveSession(signal),
    enabled: online,
    staleTime: 5_000,
    refetchInterval: (state) => (state.state.data ? POLL_INTERVAL_MS : false),
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const terminalQuery = useQuery<FocusSession | null>({
    queryKey: FOCUS_SESSION_TERMINAL_QUERY_KEY,
    queryFn: () => Promise.resolve(null),
    enabled: false,
    initialData: null,
  });
  const session = query.data ?? null;

  const refreshCanonicalSession = useCallback(async () => {
    if (!navigator.onLine) return;
    await queryClient.invalidateQueries({ queryKey: FOCUS_SESSION_QUERY_KEY });
  }, [queryClient]);

  useEffect(
    () => subscribeToFocusSessionChanges(() => void refreshCanonicalSession()),
    [refreshCanonicalSession],
  );

  useEffect(() => {
    const handleOnline = () => {
      setMessage("Connection restored. The latest Focus Session state is loaded.");
      void refreshCanonicalSession();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [refreshCanonicalSession]);

  useEffect(() => {
    if (!session || session.status !== "RUNNING") return undefined;
    const tick = () => setClientNowMs(Date.now());
    tick();
    const intervalId = window.setInterval(tick, TICK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [session]);

  const mutation = useMutation<FocusSession, unknown, FocusCommand>({
    mutationFn: async (command) => {
      if (command.action === "start") {
        return startSession(command.request, command.idempotencyKey);
      }

      const transition = transitionCommand(command.session);
      switch (command.action) {
        case "pause":
          return pauseSession(transition);
        case "resume":
          return resumeSession(transition);
        case "complete":
          return completeSession(transition);
        case "cancel":
          return cancelSession(transition);
        case "skip-break":
          return resumeFocus(transition);
        case "save-note":
          return recordInterruption(transition, command.note ?? "");
        case "automatic-transition":
          return command.session.phase === "FOCUS" &&
            command.session.plannedBreakDurationSeconds > 0
            ? startBreak(transition)
            : completeSession(transition);
      }
    },
    onMutate: () => setMessage(undefined),
    onSuccess: (next, command) => {
      const terminal = next.status === "COMPLETED" || next.status === "CANCELLED";
      queryClient.setQueryData(FOCUS_SESSION_QUERY_KEY, terminal ? null : next);
      setClientNowMs(next.clientReceivedAtMs);
      if (terminal) queryClient.setQueryData(FOCUS_SESSION_TERMINAL_QUERY_KEY, next);
      else if (command.action === "start") {
        queryClient.setQueryData(FOCUS_SESSION_TERMINAL_QUERY_KEY, null);
      }
      publishFocusSessionChange();

      if (command.action !== "save-note") {
        void queryClient.invalidateQueries({ queryKey: TODAY_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: DAILY_TIME_SUMMARY_QUERY_KEY });
      }
      if (next.timeBlockId && (command.action === "start" || terminal)) {
        void queryClient.invalidateQueries({ queryKey: TIME_BLOCKS_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
      }
      if (next.taskId && next.status === "COMPLETED") {
        void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      }
    },
    onError: (error) => {
      if (isReconciliationConflict(error)) {
        setMessage("This Focus Session changed in another tab. The latest state is now loaded.");
        void refreshCanonicalSession();
        return;
      }
      setMessage(actionErrorMessage(error));
    },
  });

  const clock = session
    ? calculateFocusSessionClock(session, clientNowMs)
    : {
        totalSeconds: 0,
        remainingSeconds: 0,
        actualFocusDurationSeconds: 0,
        actualBreakDurationSeconds: 0,
      };

  useEffect(() => {
    if (
      !online ||
      !session ||
      session.status !== "RUNNING" ||
      clock.remainingSeconds > 0 ||
      mutation.isPending
    ) {
      return;
    }
    const transitionKey = `${session.id}:${session.version}:${session.phase}`;
    if (automaticTransitions.has(transitionKey)) return;
    automaticTransitions.add(transitionKey);
    mutation.mutate({ action: "automatic-transition", session });
  }, [clock.remainingSeconds, mutation, online, session]);

  const run = (action: SessionCommand["action"], note?: string) => {
    if (!session) return Promise.reject(new Error("No active Focus Session."));
    return mutation.mutateAsync({ action, session, ...(note === undefined ? {} : { note }) });
  };

  return {
    session,
    terminalSession: terminalQuery.data,
    isLoading: online && query.isPending,
    isError: query.isError,
    loadError:
      !online && !session
        ? "Reconnect to restore the active Focus Session from the server."
        : query.isError && !session
          ? "The active Focus Session could not be loaded."
          : undefined,
    online,
    disabledReason: !online
      ? "You're offline. Confirmed session state remains visible, but changes require a connection. LifeOS will reconcile when you reconnect."
      : undefined,
    message,
    pendingAction:
      mutation.isPending && mutation.variables?.action !== "automatic-transition"
        ? mutation.variables?.action
        : undefined,
    totalSeconds: clock.totalSeconds,
    remainingSeconds: clock.remainingSeconds,
    actualFocusDurationSeconds: clock.actualFocusDurationSeconds,
    actualBreakDurationSeconds: clock.actualBreakDurationSeconds,
    retry: () => query.refetch(),
    start: (
      plannedFocusDurationSeconds: number,
      taskId?: string | null,
      timeBlockId?: string | null,
      plannedBreakDurationSeconds = 0,
    ) =>
      mutation.mutateAsync({
        action: "start",
        idempotencyKey: createIdempotencyKey(),
        request: {
          plannedFocusDurationSeconds,
          plannedBreakDurationSeconds,
          ...(taskId !== undefined ? { taskId } : {}),
          ...(timeBlockId !== undefined ? { timeBlockId } : {}),
        },
      }),
    pause: () => run("pause"),
    resume: () => run("resume"),
    complete: () => run("complete"),
    cancel: () => run("cancel"),
    skipBreak: () => run("skip-break"),
    saveInterruption: (note: string) => run("save-note", note),
    clearMessage: () => setMessage(undefined),
    clearTerminalSession: () => queryClient.setQueryData(FOCUS_SESSION_TERMINAL_QUERY_KEY, null),
  };
}
