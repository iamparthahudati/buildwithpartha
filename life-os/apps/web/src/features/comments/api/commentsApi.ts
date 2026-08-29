import { apiRequest } from "@lib/apiClient";

export type CommentParentType = "TASK" | "PROJECT";
export type CommentFormat = "PLAIN_TEXT" | "MARKDOWN";

export interface CommentResponseDto {
  readonly id: string;
  readonly authorId: string;
  readonly parentType: CommentParentType;
  readonly parentId: string;
  readonly body: string;
  readonly format: CommentFormat;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly editedAt: string | null;
  readonly version: number;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
}

export interface CommentPageDto {
  readonly items: readonly CommentResponseDto[];
  /** Zero-indexed API page. */
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface CommentRecord {
  readonly id: string;
  readonly authorId: string;
  readonly parentType: CommentParentType;
  readonly parentId: string;
  readonly body: string;
  readonly format: CommentFormat;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly editedAt: string | null;
  readonly version: number;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
}

export interface CommentPage {
  readonly items: readonly CommentRecord[];
  /** One-indexed UI page. */
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

function parentPath(parentType: CommentParentType, parentId: string): string {
  const collection = parentType === "TASK" ? "tasks" : "projects";
  return `/${collection}/${parentId}/comments`;
}

export function mapCommentResponse(dto: CommentResponseDto): CommentRecord {
  return {
    ...dto,
    // The API has already applied the selected format's safety policy. Keep the resulting
    // private body byte-for-byte and leave rendering to CommentList's text-only boundary.
    body: dto.body,
  };
}

export async function queryComments(
  parentType: CommentParentType,
  parentId: string,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<CommentPage> {
  const apiPage = Math.max(0, page - 1);
  const dto = await apiRequest<CommentPageDto>(
    `${parentPath(parentType, parentId)}?page=${apiPage}&size=${pageSize}`,
    { method: "GET", ...(signal ? { signal } : {}) },
  );
  return {
    items: dto.items.map(mapCommentResponse),
    page: dto.page + 1,
    pageSize: dto.size,
    total: dto.totalItems,
    totalPages: dto.totalPages,
  };
}

export async function createComment(
  parentType: CommentParentType,
  parentId: string,
  body: string,
): Promise<CommentRecord> {
  const dto = await apiRequest<CommentResponseDto>(parentPath(parentType, parentId), {
    method: "POST",
    body: { body, format: "PLAIN_TEXT" },
  });
  return mapCommentResponse(dto);
}

export async function updateComment(
  parentType: CommentParentType,
  parentId: string,
  commentId: string,
  body: string,
  version: number,
): Promise<CommentRecord> {
  const dto = await apiRequest<CommentResponseDto>(
    `${parentPath(parentType, parentId)}/${commentId}`,
    {
      method: "PUT",
      body: { body, format: "PLAIN_TEXT", version },
    },
  );
  return mapCommentResponse(dto);
}

export async function deleteComment(
  parentType: CommentParentType,
  parentId: string,
  commentId: string,
  version: number,
): Promise<void> {
  await apiRequest(`${parentPath(parentType, parentId)}/${commentId}`, {
    method: "DELETE",
    headers: { "If-Match": String(version) },
  });
}
