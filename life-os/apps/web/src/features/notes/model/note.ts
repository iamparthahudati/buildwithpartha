export interface NoteLink {
  readonly id: string;
  readonly noteId: string;
  readonly userId: string;
  readonly targetType: "PROJECT" | "TASK" | "GOAL";
  readonly targetId: string;
  readonly createdAt: string;
}

export interface Note {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly body: string;
  readonly pinned: boolean;
  readonly archived: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly labelIds: readonly string[];
  readonly links: readonly NoteLink[];
  readonly version: number;
}

export interface NotePageResponse<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
}
