import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { NoteCard } from "./NoteCard";
import type { Note } from "../model/note";

const MOCK_NOTE: Note = {
  id: "note-1",
  userId: "user-1",
  title: "React Components Best Practices",
  body: "This is a note about writing clean components.",
  pinned: false,
  archived: false,
  createdAt: "2026-08-20T12:00:00Z",
  updatedAt: "2026-08-20T12:00:00Z",
  labelIds: ["label-1"],
  links: [
    {
      id: "link-1",
      noteId: "note-1",
      userId: "user-1",
      targetType: "PROJECT",
      targetId: "proj-1",
      createdAt: "2026-08-20T12:00:00Z",
    },
  ],
  version: 1,
};

const MOCK_LABELS = [{ id: "label-1", name: "Learning" }];
const MOCK_LINKS = [
  {
    id: "link-1",
    targetType: "PROJECT" as const,
    targetId: "proj-1",
    title: "Awesome Project",
    href: "/life-os/app/projects/proj-1",
  },
];

describe("NoteCard", () => {
  it("renders note card details, labels, links, and triggers actions", async () => {
    const onPinToggle = vi.fn();
    const onArchiveToggle = vi.fn();
    const onDelete = vi.fn();
    const onClick = vi.fn();

    const { container } = render(
      <NoteCard
        note={MOCK_NOTE}
        labels={MOCK_LABELS}
        resolvedLinks={MOCK_LINKS}
        onPinToggle={onPinToggle}
        onArchiveToggle={onArchiveToggle}
        onDelete={onDelete}
        onClick={onClick}
      />,
    );

    expect(screen.getByText("React Components Best Practices")).toBeInTheDocument();
    expect(screen.getByText("This is a note about writing clean components.")).toBeInTheDocument();
    expect(screen.getByText("Learning")).toBeInTheDocument();
    expect(screen.getByText("Awesome Project")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Pin note" }));
    expect(onPinToggle).toHaveBeenCalledWith(MOCK_NOTE);

    await userEvent.click(screen.getByRole("button", { name: "Archive note" }));
    expect(onArchiveToggle).toHaveBeenCalledWith(MOCK_NOTE);

    await userEvent.click(screen.getByRole("button", { name: "Delete note" }));
    expect(onDelete).toHaveBeenCalledWith(MOCK_NOTE);

    // Clicking the card itself (not links/buttons) triggers onClick
    await userEvent.click(screen.getByText("React Components Best Practices"));
    expect(onClick).toHaveBeenCalledWith(MOCK_NOTE);

    await expectNoAccessibilityViolations(container);
  });

  it("renders pinned note card state and unpin label", async () => {
    const pinnedNote = { ...MOCK_NOTE, pinned: true };
    const onPinToggle = vi.fn();

    render(<NoteCard note={pinnedNote} onPinToggle={onPinToggle} />);

    await userEvent.click(screen.getByRole("button", { name: "Unpin note" }));
    expect(onPinToggle).toHaveBeenCalledWith(pinnedNote);
  });

  it("renders loading skeleton cleanly", async () => {
    const { container } = render(<NoteCard loading />);
    expect(container.querySelector(".lifeos-note-card--loading")).toBeInTheDocument();
  });
});
