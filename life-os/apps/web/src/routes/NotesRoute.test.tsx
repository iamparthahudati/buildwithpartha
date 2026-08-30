import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotesRoute } from "./NotesRoute";
import * as notesFeature from "@features/notes";
import * as tasksFeature from "@features/tasks";
import * as projectsFeature from "@features/projects";
import * as goalsFeature from "@features/goals";
import { AuthSessionContext, type AuthSessionValue } from "@state/authSession";
import { ToastProvider } from "@state/ToastProvider";
import { ApiError } from "@lib/apiClient";

vi.mock("@features/notes", async () => {
  const actual = await vi.importActual<typeof notesFeature>("@features/notes");
  return {
    ...actual,
    useNotes: vi.fn(),
    useNote: vi.fn(),
    useCreateNote: vi.fn(),
    useUpdateNote: vi.fn(),
    useDeleteNote: vi.fn(),
    usePinNote: vi.fn(),
    useUnpinNote: vi.fn(),
    useArchiveNote: vi.fn(),
    useRestoreNote: vi.fn(),
    getNote: vi.fn(),
  };
});

vi.mock("@features/tasks", async () => {
  const actual = await vi.importActual<typeof tasksFeature>("@features/tasks");
  return {
    ...actual,
    useTasks: vi.fn(),
    useTaskLabels: vi.fn(),
  };
});

vi.mock("@features/projects", async () => {
  const actual = await vi.importActual<typeof projectsFeature>("@features/projects");
  return {
    ...actual,
    useProjects: vi.fn(),
  };
});

vi.mock("@features/goals", async () => {
  const actual = await vi.importActual<typeof goalsFeature>("@features/goals");
  return {
    ...actual,
    useGoals: vi.fn(),
  };
});

const mockUseNotes = vi.mocked(notesFeature.useNotes);
const mockUseNote = vi.mocked(notesFeature.useNote);
const mockUseCreateNote = vi.mocked(notesFeature.useCreateNote);
const mockUseUpdateNote = vi.mocked(notesFeature.useUpdateNote);
const mockUseDeleteNote = vi.mocked(notesFeature.useDeleteNote);
const mockUsePinNote = vi.mocked(notesFeature.usePinNote);
const mockUseUnpinNote = vi.mocked(notesFeature.useUnpinNote);
const mockUseArchiveNote = vi.mocked(notesFeature.useArchiveNote);
const mockUseRestoreNote = vi.mocked(notesFeature.useRestoreNote);
const mockGetNote = vi.mocked(notesFeature.getNote);

const mockUseTasks = vi.mocked(tasksFeature.useTasks);
const mockUseTaskLabels = vi.mocked(tasksFeature.useTaskLabels);
const mockUseProjects = vi.mocked(projectsFeature.useProjects);
const mockUseGoals = vi.mocked(goalsFeature.useGoals);

const MOCK_USER = {
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  timeZone: "UTC",
  locale: "en-US",
  weekStart: 1,
};

const MOCK_AUTH_STATE: AuthSessionValue = {
  user: MOCK_USER,
  csrfToken: "mock-csrf-token",
  isBootstrapping: false,
  setSession: vi.fn(),
  clearSession: vi.fn(),
};

const MOCK_NOTE_1: notesFeature.Note = {
  id: "note-1",
  userId: "user-1",
  title: "Read LifeOS Docs",
  body: "This is a **markdown** note body.",
  pinned: false,
  archived: false,
  createdAt: "2026-08-20T10:00:00Z",
  updatedAt: "2026-08-20T12:00:00Z",
  labelIds: ["label-1"],
  links: [],
  version: 1,
};

// Stable mutation spies
const spyCreate = vi.fn();
const spyUpdate = vi.fn();
const spyDelete = vi.fn();
const spyPin = vi.fn();
const spyUnpin = vi.fn();
const spyArchive = vi.fn();
const spyRestore = vi.fn();
const spyRefetch = vi.fn();

function renderNotesRoute(initialEntries = ["/life-os/app/notes"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthSessionContext.Provider value={MOCK_AUTH_STATE}>
        <ToastProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/life-os/app/notes" element={<NotesRoute />} />
              <Route path="/life-os/app/notes/:noteId" element={<NotesRoute />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthSessionContext.Provider>
    </QueryClientProvider>,
  );
}

describe("NotesRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    spyCreate.mockReset().mockResolvedValue(MOCK_NOTE_1);
    spyUpdate.mockReset().mockResolvedValue(MOCK_NOTE_1);
    spyDelete.mockReset().mockResolvedValue(undefined);
    spyPin.mockReset().mockResolvedValue(MOCK_NOTE_1);
    spyUnpin.mockReset().mockResolvedValue(MOCK_NOTE_1);
    spyArchive.mockReset().mockResolvedValue(MOCK_NOTE_1);
    spyRestore.mockReset().mockResolvedValue(MOCK_NOTE_1);
    spyRefetch.mockReset();

    mockUseNotes.mockReturnValue({
      data: {
        items: [MOCK_NOTE_1],
        page: 0,
        size: 20,
        totalItems: 1,
        totalPages: 1,
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    mockUseNote.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
      error: null,
      refetch: spyRefetch,
    } as any);

    mockUseTaskLabels.mockReturnValue({
      data: [{ id: "label-1", name: "Work" }],
      isPending: false,
      isError: false,
      error: null,
    } as any);

    mockUseProjects.mockReturnValue({
      data: { items: [] },
      isPending: false,
      isError: false,
    } as any);

    mockUseTasks.mockReturnValue({
      data: { items: [] },
      isPending: false,
      isError: false,
    } as any);

    mockUseGoals.mockReturnValue({
      data: { items: [] },
      isPending: false,
      isError: false,
    } as any);

    mockUseCreateNote.mockReturnValue({ mutateAsync: spyCreate, isPending: false } as any);
    mockUseUpdateNote.mockReturnValue({ mutateAsync: spyUpdate, isPending: false } as any);
    mockUseDeleteNote.mockReturnValue({ mutateAsync: spyDelete, isPending: false } as any);
    mockUsePinNote.mockReturnValue({ mutateAsync: spyPin, isPending: false } as any);
    mockUseUnpinNote.mockReturnValue({ mutateAsync: spyUnpin, isPending: false } as any);
    mockUseArchiveNote.mockReturnValue({ mutateAsync: spyArchive, isPending: false } as any);
    mockUseRestoreNote.mockReturnValue({ mutateAsync: spyRestore, isPending: false } as any);
  });

  it("renders notes list page correctly", () => {
    renderNotesRoute();

    expect(screen.getByText("Read LifeOS Docs")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Label" })).toBeInTheDocument();
  });

  it("loads a specific note details when accessing via deep link", async () => {
    mockUseNote.mockReturnValue({
      data: MOCK_NOTE_1,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderNotesRoute(["/life-os/app/notes/note-1"]);

    expect(screen.getByLabelText("Title")).toHaveValue("Read LifeOS Docs");
    expect(screen.getByLabelText("Body")).toHaveValue("This is a **markdown** note body.");
  });

  it("allows switching to preview mode to render SafeMarkdown details", async () => {
    mockUseNote.mockReturnValue({
      data: MOCK_NOTE_1,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderNotesRoute(["/life-os/app/notes/note-1"]);

    // Click Preview tab
    await userEvent.click(screen.getByRole("button", { name: /Preview/ }));

    // Title should be rendered in preview header, and body parsed in markdown
    expect(screen.getByRole("heading", { level: 2, name: "Read LifeOS Docs" })).toBeInTheDocument();
    expect(screen.getByText("markdown").tagName).toBe("STRONG");
  });

  it("triggers pin toggle mutation when pin button is clicked", async () => {
    mockUseNote.mockReturnValue({
      data: MOCK_NOTE_1,
      isPending: false,
      isError: false,
      error: null,
      refetch: spyRefetch,
    } as any);

    renderNotesRoute(["/life-os/app/notes/note-1"]);

    await userEvent.click(screen.getAllByRole("button", { name: /Pin note/ })[1]!);

    expect(spyPin).toHaveBeenCalledWith({ id: "note-1", version: 1 });
  });

  it("triggers archive mutation when archive button is clicked", async () => {
    mockUseNote.mockReturnValue({
      data: MOCK_NOTE_1,
      isPending: false,
      isError: false,
      error: null,
      refetch: spyRefetch,
    } as any);

    renderNotesRoute(["/life-os/app/notes/note-1"]);

    await userEvent.click(screen.getAllByRole("button", { name: /Archive note/ })[1]!);

    expect(spyArchive).toHaveBeenCalledWith({ id: "note-1", version: 1 });
  });

  it("triggers delete mutation when deleting note is confirmed", async () => {
    mockUseNote.mockReturnValue({
      data: MOCK_NOTE_1,
      isPending: false,
      isError: false,
      error: null,
      refetch: spyRefetch,
    } as any);

    renderNotesRoute(["/life-os/app/notes/note-1"]);

    // Click Delete action in details panel
    await userEvent.click(screen.getAllByRole("button", { name: /Delete note/ })[1]!);

    // In ConfirmDialog, click Delete
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(spyDelete).toHaveBeenCalledWith("note-1");
  });

  it("handles version conflict resolution actions", async () => {
    mockUseNote.mockReturnValue({
      data: MOCK_NOTE_1,
      isPending: false,
      isError: false,
      error: null,
      refetch: spyRefetch,
    } as any);

    // Render in edit mode
    renderNotesRoute(["/life-os/app/notes/note-1"]);

    // Make the spy reject with a 409 Conflict ApiError
    spyUpdate.mockRejectedValue(new ApiError(409, { status: 409, detail: "Conflict" } as any));

    // Try saving note to trigger conflict error state
    await userEvent.type(screen.getByLabelText("Title"), " New title content");
    await userEvent.click(screen.getByRole("button", { name: "Save note" }));

    // Verify that the update mutation was actually triggered
    await waitFor(() => {
      expect(spyUpdate).toHaveBeenCalled();
    });

    // Resolve choice server version
    mockGetNote.mockResolvedValueOnce({ ...MOCK_NOTE_1, title: "Server Side Title", version: 2 });

    // Check buttons are present and click Use Server Version asynchronously
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Use Server Version" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Use Server Version" }));

    // Resolving with server should trigger detail query refetch
    await waitFor(() => {
      expect(spyRefetch).toHaveBeenCalled();
    });
  });

  it("keeps an offline edit in the open tab without claiming it was queued", async () => {
    const onlineSpy = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    try {
      mockUseNote.mockReturnValue({
        data: MOCK_NOTE_1,
        isPending: false,
        isError: false,
        error: null,
        refetch: spyRefetch,
      } as any);

      renderNotesRoute(["/life-os/app/notes/note-1"]);
      await userEvent.type(screen.getByLabelText("Title"), " offline edit");
      await userEvent.click(screen.getByRole("button", { name: "Save note" }));

      expect(spyUpdate).not.toHaveBeenCalled();
      expect(screen.getByText("Not saved — reconnect and choose Save note")).toBeInTheDocument();
      expect(screen.queryByText(/queued|saved on this device/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText("Title")).toHaveValue("Read LifeOS Docs offline edit");
    } finally {
      onlineSpy.mockRestore();
    }
  });
});
