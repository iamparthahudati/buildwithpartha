import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useNotes,
  useNote,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  usePinNote,
  useUnpinNote,
  useArchiveNote,
  useRestoreNote,
} from "../index";
import * as notesApi from "../api/notesApi";
import type { Note } from "../model/note";

vi.mock("../api/notesApi", () => ({
  queryNotes: vi.fn(),
  getNote: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  pinNote: vi.fn(),
  unpinNote: vi.fn(),
  archiveNote: vi.fn(),
  restoreNote: vi.fn(),
}));

const mockQueryNotes = vi.mocked(notesApi.queryNotes);
const mockGetNote = vi.mocked(notesApi.getNote);
const mockCreateNote = vi.mocked(notesApi.createNote);
const mockUpdateNote = vi.mocked(notesApi.updateNote);
const mockDeleteNote = vi.mocked(notesApi.deleteNote);
const mockPinNote = vi.mocked(notesApi.pinNote);
const mockUnpinNote = vi.mocked(notesApi.unpinNote);
const mockArchiveNote = vi.mocked(notesApi.archiveNote);
const mockRestoreNote = vi.mocked(notesApi.restoreNote);

const MOCK_NOTE: Note = {
  id: "note-1",
  userId: "user-1",
  title: "Test Note",
  body: "Test Body",
  pinned: false,
  archived: false,
  createdAt: "2026-08-01T12:00:00Z",
  updatedAt: "2026-08-01T12:00:00Z",
  labelIds: [],
  links: [],
  version: 1,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
}

describe("useNotes hooks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("useNotes fetches a list of notes", async () => {
    mockQueryNotes.mockResolvedValueOnce({
      items: [MOCK_NOTE],
      page: 0,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotes({ q: "Test" }), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0]?.id).toBe("note-1");
  });

  it("useNote fetches a single note", async () => {
    mockGetNote.mockResolvedValueOnce(MOCK_NOTE);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNote("note-1"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe("Test Note");
  });

  it("useCreateNote triggers create api call", async () => {
    mockCreateNote.mockResolvedValueOnce(MOCK_NOTE);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateNote(), { wrapper: Wrapper });

    result.current.mutate({ title: "New Note", body: "New Body", labelIds: [], links: [] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreateNote).toHaveBeenCalledWith({
      title: "New Note",
      body: "New Body",
      labelIds: [],
      links: [],
    });
  });

  it("useUpdateNote triggers update api call", async () => {
    mockUpdateNote.mockResolvedValueOnce(MOCK_NOTE);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateNote(), { wrapper: Wrapper });

    result.current.mutate({
      id: "note-1",
      request: { title: "Updated", body: "Body", labelIds: [], links: [], version: 1 },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateNote).toHaveBeenCalledWith("note-1", {
      title: "Updated",
      body: "Body",
      labelIds: [],
      links: [],
      version: 1,
    });
  });

  it("useDeleteNote triggers delete api call", async () => {
    mockDeleteNote.mockResolvedValueOnce(undefined);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteNote(), { wrapper: Wrapper });

    result.current.mutate("note-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeleteNote).toHaveBeenCalledWith("note-1");
  });

  it("usePinNote triggers pin api call", async () => {
    mockPinNote.mockResolvedValueOnce({ ...MOCK_NOTE, pinned: true });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePinNote(), { wrapper: Wrapper });

    result.current.mutate({ id: "note-1", version: 1 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPinNote).toHaveBeenCalledWith("note-1", 1);
  });

  it("useUnpinNote triggers unpin api call", async () => {
    mockUnpinNote.mockResolvedValueOnce({ ...MOCK_NOTE, pinned: false });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUnpinNote(), { wrapper: Wrapper });

    result.current.mutate({ id: "note-1", version: 1 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUnpinNote).toHaveBeenCalledWith("note-1", 1);
  });

  it("useArchiveNote triggers archive api call", async () => {
    mockArchiveNote.mockResolvedValueOnce({ ...MOCK_NOTE, archived: true });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useArchiveNote(), { wrapper: Wrapper });

    result.current.mutate({ id: "note-1", version: 1 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockArchiveNote).toHaveBeenCalledWith("note-1", 1);
  });

  it("useRestoreNote triggers restore api call", async () => {
    mockRestoreNote.mockResolvedValueOnce({ ...MOCK_NOTE, archived: false });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRestoreNote(), { wrapper: Wrapper });

    result.current.mutate({ id: "note-1", version: 1 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRestoreNote).toHaveBeenCalledWith("note-1", 1);
  });
});
