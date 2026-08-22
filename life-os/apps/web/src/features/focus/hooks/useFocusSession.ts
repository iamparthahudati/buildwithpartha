import { useEffect, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelSession,
  completeSession,
  getActiveSession,
  pauseSession,
  resumeSession,
  startSession,
  type FocusSession,
  type FocusSessionStatus,
  type StartFocusSessionRequest,
} from "../api/focusApi";

const LOCAL_STORAGE_KEY = "lifeos-active-focus-session";

async function fetchActiveSession(): Promise<FocusSession | null> {
  try {
    const session = await getActiveSession();
    if (session) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session));
      return session;
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return null;
    }
  } catch (error) {
    console.warn("Server API failed, falling back to localStorage:", error);
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      try {
        return JSON.parse(local) as FocusSession;
      } catch {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
    return null;
  }
}

export function useFocusSession() {
  const queryClient = useQueryClient();

  const {
    data: session,
    isLoading,
    isError,
  } = useQuery<FocusSession | null>({
    queryKey: ["focusSession", "active"],
    queryFn: fetchActiveSession,
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  const [prevSessionId, setPrevSessionId] = useState<string | null>(null);
  const [prevStatus, setPrevStatus] = useState<FocusSessionStatus | "idle">("idle");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    session ? session.remainingSeconds : 0,
  );
  const completeMutationRef = useRef<boolean>(false);

  const currentSessionId = session?.id ?? null;
  const currentStatus = session?.status ?? "idle";

  if (currentSessionId !== prevSessionId || currentStatus !== prevStatus) {
    setPrevSessionId(currentSessionId);
    setPrevStatus(currentStatus);
    setRemainingSeconds(session ? session.remainingSeconds : 0);
  }

  const startMutation = useMutation({
    mutationFn: async (req: StartFocusSessionRequest) => {
      try {
        const data = await startSession(req);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        return data;
      } catch (error) {
        console.warn("Server start API failed, falling back to localStorage:", error);
        const localSession: FocusSession = {
          id:
            typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : Math.random().toString(),
          taskId: req.taskId ?? null,
          timeBlockId: req.timeBlockId ?? null,
          totalSeconds: req.totalSeconds,
          remainingSeconds: req.totalSeconds,
          status: "running",
          phase: "focus",
          startedAt: new Date().toISOString(),
          pausedAt: null,
          lastStateUpdatedAt: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localSession));
        return localSession;
      }
    },
    onSuccess: (data) => {
      completeMutationRef.current = false;
      queryClient.setQueryData(["focusSession", "active"], data);
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      try {
        const data = await pauseSession();
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        return data;
      } catch (error) {
        console.warn("Server pause API failed, falling back to localStorage:", error);
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!local) throw error;
        const current = JSON.parse(local) as FocusSession;
        if (current.status !== "running") return current;

        const elapsed = Math.floor(
          (Date.now() - new Date(current.lastStateUpdatedAt).getTime()) / 1000,
        );
        const nextRemaining = Math.max(0, current.remainingSeconds - elapsed);
        const updated: FocusSession = {
          ...current,
          status: "paused",
          pausedAt: new Date().toISOString(),
          remainingSeconds: nextRemaining,
          lastStateUpdatedAt: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["focusSession", "active"], data);
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      try {
        const data = await resumeSession();
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        return data;
      } catch (error) {
        console.warn("Server resume API failed, falling back to localStorage:", error);
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!local) throw error;
        const current = JSON.parse(local) as FocusSession;
        if (current.status !== "paused") return current;

        const updated: FocusSession = {
          ...current,
          status: "running",
          pausedAt: null,
          lastStateUpdatedAt: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      }
    },
    onSuccess: (data) => {
      completeMutationRef.current = false;
      queryClient.setQueryData(["focusSession", "active"], data);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      try {
        const data = await completeSession();
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        return data;
      } catch (error) {
        console.warn("Server complete API failed, falling back to localStorage:", error);
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!local) throw error;
        const current = JSON.parse(local) as FocusSession;

        const updated: FocusSession = {
          ...current,
          status: "completed",
          remainingSeconds: 0,
          lastStateUpdatedAt: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["focusSession", "active"], data);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      try {
        await cancelSession();
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (error) {
        console.warn("Server cancel API failed, falling back to localStorage:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
      return null;
    },
    onSuccess: () => {
      completeMutationRef.current = false;
      queryClient.setQueryData(["focusSession", "active"], null);
    },
  });

  // Ticking logic
  useEffect(() => {
    if (!session || session.status !== "running") {
      return;
    }

    const lastUpdatedTime = new Date(session.lastStateUpdatedAt).getTime();
    const plannedEndTimestamp = lastUpdatedTime + session.remainingSeconds * 1000;

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.round((plannedEndTimestamp - now) / 1000));
      setRemainingSeconds(remaining);

      if (remaining <= 0 && !completeMutationRef.current) {
        completeMutationRef.current = true;
        completeMutation.mutate();
      }
    };

    tick();
    const intervalId = setInterval(tick, 200);
    return () => clearInterval(intervalId);
  }, [session, completeMutation]);

  return {
    session,
    isLoading,
    isError,
    remainingSeconds,
    start: (totalSeconds: number, taskId?: string | null) => {
      const req: StartFocusSessionRequest = {
        totalSeconds,
        ...(taskId !== undefined ? { taskId } : {}),
      };
      return startMutation.mutateAsync(req);
    },
    pause: () => pauseMutation.mutateAsync(),
    resume: () => resumeMutation.mutateAsync(),
    complete: () => completeMutation.mutateAsync(),
    cancel: () => cancelMutation.mutateAsync(),
    reset: () => cancelMutation.mutateAsync(),
  };
}
