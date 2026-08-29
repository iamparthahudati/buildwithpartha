import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { invalidateActivityQueries } from "@features/activity";
import {
  queryNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  pinNote,
  unpinNote,
  archiveNote,
  restoreNote,
  type NoteQueryParams,
  type CreateNoteRequestDto,
  type UpdateNoteRequestDto,
} from "../api/notesApi";
import type { Note, NotePageResponse } from "../model/note";

export const NOTES_QUERY_KEY = ["notes"] as const;

export const notesQueryKeys = {
  all: NOTES_QUERY_KEY,
  list: (params: NoteQueryParams) => [...NOTES_QUERY_KEY, "list", params] as const,
  single: (id: string) => [...NOTES_QUERY_KEY, "single", id] as const,
};

export function invalidateNotesQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY });
}

export function useNotes(
  params: NoteQueryParams = {},
  enabled = true,
): UseQueryResult<NotePageResponse<Note>, Error> {
  return useQuery({
    queryKey: notesQueryKeys.list(params),
    queryFn: ({ signal }) => queryNotes(params, signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export function useNote(id: string, enabled = true): UseQueryResult<Note, Error> {
  return useQuery({
    queryKey: notesQueryKeys.single(id),
    queryFn: ({ signal }) => getNote(id, signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export function useCreateNote(): UseMutationResult<Note, Error, CreateNoteRequestDto> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateNoteRequestDto) => createNote(request),
    onSuccess: () => {
      void invalidateNotesQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useUpdateNote(): UseMutationResult<
  Note,
  Error,
  { readonly id: string; readonly request: UpdateNoteRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }) => updateNote(id, request),
    onSuccess: () => {
      void invalidateNotesQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useDeleteNote(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => {
      void invalidateNotesQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function usePinNote(): UseMutationResult<
  Note,
  Error,
  { readonly id: string; readonly version: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }) => pinNote(id, version),
    onSuccess: () => {
      void invalidateNotesQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useUnpinNote(): UseMutationResult<
  Note,
  Error,
  { readonly id: string; readonly version: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }) => unpinNote(id, version),
    onSuccess: () => {
      void invalidateNotesQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useArchiveNote(): UseMutationResult<
  Note,
  Error,
  { readonly id: string; readonly version: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }) => archiveNote(id, version),
    onSuccess: () => {
      void invalidateNotesQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useRestoreNote(): UseMutationResult<
  Note,
  Error,
  { readonly id: string; readonly version: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }) => restoreNote(id, version),
    onSuccess: () => {
      void invalidateNotesQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}
