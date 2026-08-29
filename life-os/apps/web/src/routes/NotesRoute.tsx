import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useProjects } from "@features/projects";
import { useTasks, useTaskLabels } from "@features/tasks";
import { useGoals } from "@features/goals";
import {
  NotesScreen,
  useNotes,
  useNote,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  usePinNote,
  useUnpinNote,
  useArchiveNote,
  useRestoreNote,
  getNote,
  type Note,
  type NoteFormData,
  type NoteAutosaveStatus,
} from "@features/notes";
import { useAuthSession } from "@state/authSession";
import { useToast } from "@state/toastQueue";
import { ApiError } from "@lib/apiClient";

export function NotesRoute() {
  const { user } = useAuthSession();
  const toast = useToast();
  const navigate = useNavigate();
  const { noteId } = useParams<{ readonly noteId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [autosaveStatusState, setAutosaveStatusState] = useState<NoteAutosaveStatus>({
    type: "idle",
  });
  const lastAttemptedDraft = useRef<NoteFormData | null>(null);

  // Read URL search params
  const searchQuery = searchParams.get("q") ?? "";
  const selectedLabelId = searchParams.get("labelId") ?? null;
  const statusTab = (searchParams.get("status") ?? "ACTIVE") as "ACTIVE" | "ARCHIVED";
  const selectedNoteId = noteId ?? searchParams.get("selected") ?? null;
  const isCreatingNewNote = selectedNoteId === "new";

  // Browser online/offline tracking
  const [isOnline, setIsOnline] = useState(() =>
    typeof window !== "undefined" ? window.navigator.onLine : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Update URL Search parameters helper
  const updateUrlParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === "") {
              next.delete(key);
            } else {
              next.set(key, value);
            }
          });
          return Object.fromEntries(next.entries());
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Queries
  const labelsQuery = useTaskLabels(user !== null);
  const projectsQuery = useProjects({ size: 100, archived: false }, user !== null);
  const tasksQuery = useTasks({ page: 0, size: 100, archived: false }, user !== null);
  const goalsQuery = useGoals({ page: 0, size: 100, archived: false }, user !== null);

  const apiQueryParams = useMemo(() => {
    const params: any = {
      archived: statusTab === "ARCHIVED",
      page: 0,
      size: 100,
      sortBy: "updatedAt",
      sortDirection: "DESC" as const,
    };
    if (searchQuery) {
      params.q = searchQuery;
    }
    if (selectedLabelId) {
      params.labelId = [selectedLabelId];
    }
    return params;
  }, [searchQuery, selectedLabelId, statusTab]);

  const notesQuery = useNotes(apiQueryParams, user !== null);
  const noteDetailQuery = useNote(
    selectedNoteId ?? "",
    user !== null && selectedNoteId !== null && !isCreatingNewNote,
  );

  const selectedNote = useMemo(() => {
    if (isCreatingNewNote || !selectedNoteId) return null;
    return (
      noteDetailQuery.data ??
      notesQuery.data?.items.find((note) => note.id === selectedNoteId) ??
      null
    );
  }, [selectedNoteId, isCreatingNewNote, noteDetailQuery.data, notesQuery.data?.items]);

  // Mutations
  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();
  const pinMutation = usePinNote();
  const unpinMutation = useUnpinNote();
  const archiveMutation = useArchiveNote();
  const restoreMutation = useRestoreNote();

  // Handlers
  const handleSelectNote = (note: Note | null) => {
    setAutosaveStatusState({ type: "idle" });
    if (note) {
      navigate(`/life-os/app/notes/${note.id}`);
    } else {
      navigate("/life-os/app/notes");
    }
  };

  const handleCreateNoteTrigger = () => {
    setAutosaveStatusState({ type: "idle" });
    navigate("/life-os/app/notes/new");
  };

  const handleSearchQueryChange = (q: string) => {
    updateUrlParams({ q });
  };

  const handleLabelFilterChange = (labelId: string | null) => {
    updateUrlParams({ labelId });
  };

  const handleStatusTabChange = (tab: "ACTIVE" | "ARCHIVED") => {
    updateUrlParams({ status: tab });
  };

  const handleSubmitNote = async (data: NoteFormData) => {
    if (!isOnline) {
      setAutosaveStatusState({ type: "queued" });
      return;
    }

    setAutosaveStatusState({ type: "saving" });

    if (isCreatingNewNote) {
      try {
        const newNote = await createMutation.mutateAsync(data);
        setAutosaveStatusState({ type: "saved" });
        toast.push({ tone: "success", message: "Note created." });
        // Navigate to the newly created note
        navigate(`/life-os/app/notes/${newNote.id}`);
      } catch (err) {
        setAutosaveStatusState({ type: "idle" });
        toast.push({ tone: "danger", message: "Failed to create note." });
      }
    } else if (selectedNote) {
      lastAttemptedDraft.current = data;
      try {
        await updateMutation.mutateAsync({
          id: selectedNote.id,
          request: {
            title: data.title,
            body: data.body,
            labelIds: data.labelIds,
            links: data.links,
            version: selectedNote.version,
          },
        });
        setAutosaveStatusState({ type: "saved" });
      } catch (err) {
        if (
          (err instanceof ApiError && err.status === 409) ||
          (err && (err as any).status === 409)
        ) {
          setAutosaveStatusState({
            type: "conflict",
            message: "Stale version: note changed elsewhere.",
          });
        } else {
          setAutosaveStatusState({ type: "idle" });
          toast.push({ tone: "danger", message: "Failed to save note." });
        }
      }
    }
  };

  const handleResolveConflict = async (choice: "server" | "draft") => {
    if (!selectedNoteId) return;

    if (choice === "server") {
      setAutosaveStatusState({ type: "idle" });
      void noteDetailQuery.refetch();
      toast.push({ tone: "info", message: "Loaded the latest server version." });
    } else if (choice === "draft") {
      if (!lastAttemptedDraft.current) return;
      try {
        setAutosaveStatusState({ type: "saving" });
        // Fetch the latest note metadata from the server to get its version
        const latestNote = await getNote(selectedNoteId);
        // Resubmit the draft content with the new version
        await updateMutation.mutateAsync({
          id: selectedNoteId,
          request: {
            title: lastAttemptedDraft.current.title,
            body: lastAttemptedDraft.current.body,
            labelIds: lastAttemptedDraft.current.labelIds,
            links: lastAttemptedDraft.current.links,
            version: latestNote.version,
          },
        });
        setAutosaveStatusState({ type: "saved" });
        toast.push({ tone: "success", message: "Note overwritten." });
      } catch (err) {
        if (
          (err instanceof ApiError && err.status === 409) ||
          (err && (err as any).status === 409)
        ) {
          setAutosaveStatusState({
            type: "conflict",
            message: "Stale version: another change was made. Try resolving again.",
          });
        } else {
          setAutosaveStatusState({ type: "idle" });
          toast.push({ tone: "danger", message: "Failed to save note." });
        }
      }
    }
  };

  const handleDeleteNote = async (note: Note) => {
    try {
      await deleteMutation.mutateAsync(note.id);
      toast.push({ tone: "success", message: "Note deleted." });
      if (selectedNoteId === note.id) {
        handleSelectNote(null);
      }
    } catch (err) {
      toast.push({ tone: "danger", message: "Failed to delete note." });
    }
  };

  const handlePinToggle = async (note: Note) => {
    try {
      if (note.pinned) {
        await unpinMutation.mutateAsync({ id: note.id, version: note.version });
        toast.push({ tone: "success", message: "Note unpinned." });
      } else {
        await pinMutation.mutateAsync({ id: note.id, version: note.version });
        toast.push({ tone: "success", message: "Note pinned." });
      }
    } catch (err) {
      if ((err instanceof ApiError && err.status === 409) || (err && (err as any).status === 409)) {
        toast.push({ tone: "danger", message: "Note version mismatch. Reloading..." });
        void noteDetailQuery.refetch();
        void notesQuery.refetch();
      } else {
        toast.push({ tone: "danger", message: "Failed to update pinned state." });
      }
    }
  };

  const handleArchiveToggle = async (note: Note) => {
    try {
      if (note.archived) {
        await restoreMutation.mutateAsync({ id: note.id, version: note.version });
        toast.push({ tone: "success", message: "Note restored from archive." });
        // Go back to notes list
        handleSelectNote(null);
      } else {
        await archiveMutation.mutateAsync({ id: note.id, version: note.version });
        toast.push({ tone: "success", message: "Note archived." });
        // Go back to notes list
        handleSelectNote(null);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.push({ tone: "danger", message: "Note version mismatch. Reloading..." });
        void noteDetailQuery.refetch();
        void notesQuery.refetch();
      } else {
        toast.push({ tone: "danger", message: "Failed to update archived state." });
      }
    }
  };

  if (user === null) {
    return null;
  }

  const notesList = notesQuery.data?.items ?? [];

  return (
    <NotesScreen
      notes={notesList}
      loading={notesQuery.isPending}
      error={notesQuery.isError ? (notesQuery.error?.message ?? "Failed to load notes.") : null}
      searchQuery={searchQuery}
      onSearchQueryChange={handleSearchQueryChange}
      selectedLabelId={selectedLabelId}
      onLabelFilterChange={handleLabelFilterChange}
      statusTab={statusTab}
      onStatusTabChange={handleStatusTabChange}
      selectedNote={selectedNote}
      isCreatingNewNote={isCreatingNewNote}
      onSelectNote={handleSelectNote}
      onCreateNoteTrigger={handleCreateNoteTrigger}
      onSubmitNote={handleSubmitNote}
      onDeleteNote={handleDeleteNote}
      onPinToggle={handlePinToggle}
      onArchiveToggle={handleArchiveToggle}
      isOnline={isOnline}
      autosaveStatus={autosaveStatusState}
      onResolveConflict={handleResolveConflict}
      labels={labelsQuery.data ?? []}
      availableProjects={(projectsQuery.data?.items ?? []).map((p) => ({
        id: p.id,
        title: p.name,
      }))}
      availableTasks={tasksQuery.data?.items ?? []}
      availableGoals={goalsQuery.data?.items ?? []}
    />
  );
}
