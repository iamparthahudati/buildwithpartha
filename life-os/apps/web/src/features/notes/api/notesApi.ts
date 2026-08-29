import { apiRequest } from "@lib/apiClient";
import type { Note, NoteLink, NotePageResponse } from "../model/note";

export interface NoteLinkDto {
  readonly id: string;
  readonly noteId: string;
  readonly userId: string;
  readonly targetType: "PROJECT" | "TASK" | "GOAL";
  readonly targetId: string;
  readonly createdAt: string;
}

export interface NoteResponseDto {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly body: string;
  readonly pinned: boolean;
  readonly archived: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly labelIds: readonly string[];
  readonly links: readonly NoteLinkDto[];
  readonly version: number;
}

export interface NoteQueryParams {
  readonly q?: string;
  readonly pinned?: boolean;
  readonly archived?: boolean;
  readonly labelId?: readonly string[];
  readonly page?: number;
  readonly size?: number;
  readonly sortBy?: string;
  readonly sortDirection?: "ASC" | "DESC";
}

export interface CreateNoteRequestDto {
  readonly title: string;
  readonly body: string;
  readonly labelIds: readonly string[];
  readonly links: readonly {
    readonly targetType: "PROJECT" | "TASK" | "GOAL";
    readonly targetId: string;
  }[];
}

export interface UpdateNoteRequestDto {
  readonly title: string;
  readonly body: string;
  readonly labelIds: readonly string[];
  readonly links: readonly {
    readonly targetType: "PROJECT" | "TASK" | "GOAL";
    readonly targetId: string;
  }[];
  readonly version: number;
}

export function mapNoteLinkDto(dto: NoteLinkDto): NoteLink {
  return {
    id: dto.id,
    noteId: dto.noteId,
    userId: dto.userId,
    targetType: dto.targetType,
    targetId: dto.targetId,
    createdAt: dto.createdAt,
  };
}

export function mapNoteResponse(dto: NoteResponseDto): Note {
  return {
    id: dto.id,
    userId: dto.userId,
    title: dto.title,
    body: dto.body,
    pinned: dto.pinned,
    archived: dto.archived,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    labelIds: dto.labelIds ?? [],
    links: (dto.links ?? []).map(mapNoteLinkDto),
    version: dto.version,
  };
}

export async function queryNotes(
  params: NoteQueryParams = {},
  signal?: AbortSignal,
): Promise<NotePageResponse<Note>> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.pinned !== undefined) query.set("pinned", String(params.pinned));
  if (params.archived !== undefined) query.set("archived", String(params.archived));
  if (params.labelId && params.labelId.length > 0) {
    params.labelId.forEach((id) => query.append("labelId", id));
  }
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.size !== undefined) query.set("size", String(params.size));
  if (params.sortBy !== undefined) query.set("sortBy", params.sortBy);
  if (params.sortDirection !== undefined) query.set("sortDirection", params.sortDirection);

  const queryString = query.toString();
  const path = `/notes${queryString ? `?${queryString}` : ""}`;

  const response = await apiRequest<{
    readonly items: readonly NoteResponseDto[];
    readonly page: number;
    readonly size: number;
    readonly totalItems: number;
    readonly totalPages: number;
  }>(path, { method: "GET", ...(signal ? { signal } : {}) });

  return {
    items: response.items.map(mapNoteResponse),
    page: response.page,
    size: response.size,
    totalItems: response.totalItems,
    totalPages: response.totalPages,
  };
}

export async function getNote(id: string, signal?: AbortSignal): Promise<Note> {
  const dto = await apiRequest<NoteResponseDto>(`/notes/${id}`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return mapNoteResponse(dto);
}

export async function createNote(request: CreateNoteRequestDto): Promise<Note> {
  const dto = await apiRequest<NoteResponseDto>("/notes", {
    method: "POST",
    body: request,
  });
  return mapNoteResponse(dto);
}

export async function updateNote(id: string, request: UpdateNoteRequestDto): Promise<Note> {
  const dto = await apiRequest<NoteResponseDto>(`/notes/${id}`, {
    method: "PUT",
    body: request,
  });
  return mapNoteResponse(dto);
}

export async function deleteNote(id: string): Promise<void> {
  await apiRequest<void>(`/notes/${id}`, { method: "DELETE" });
}

export async function pinNote(id: string, version: number): Promise<Note> {
  const dto = await apiRequest<NoteResponseDto>(`/notes/${id}/pin`, {
    method: "POST",
    body: { version },
  });
  return mapNoteResponse(dto);
}

export async function unpinNote(id: string, version: number): Promise<Note> {
  const dto = await apiRequest<NoteResponseDto>(`/notes/${id}/unpin`, {
    method: "POST",
    body: { version },
  });
  return mapNoteResponse(dto);
}

export async function archiveNote(id: string, version: number): Promise<Note> {
  const dto = await apiRequest<NoteResponseDto>(`/notes/${id}/archive`, {
    method: "POST",
    body: { version },
  });
  return mapNoteResponse(dto);
}

export async function restoreNote(id: string, version: number): Promise<Note> {
  const dto = await apiRequest<NoteResponseDto>(`/notes/${id}/restore`, {
    method: "POST",
    body: { version },
  });
  return mapNoteResponse(dto);
}
