import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@lib/apiClient";

import {
  createComment,
  deleteComment,
  mapCommentResponse,
  queryComments,
  updateComment,
  type CommentResponseDto,
} from "../api/commentsApi";

vi.mock("@lib/apiClient", () => ({ apiRequest: vi.fn() }));

const mockApiRequest = vi.mocked(apiRequest);
const UNTRUSTED_BODY = '<img src=x onerror="alert(1)"> [Open](javascript:alert(1))';
const DTO: CommentResponseDto = {
  id: "comment-1",
  authorId: "user-1",
  parentType: "TASK",
  parentId: "task-1",
  body: UNTRUSTED_BODY,
  format: "PLAIN_TEXT",
  createdAt: "2026-08-23T08:00:00Z",
  updatedAt: "2026-08-23T08:00:00Z",
  editedAt: null,
  version: 3,
  canEdit: true,
  canDelete: true,
};

describe("commentsApi", () => {
  beforeEach(() => vi.resetAllMocks());

  it("maps the server-safe body without interpreting or rewriting it", () => {
    expect(mapCommentResponse(DTO).body).toBe(UNTRUSTED_BODY);
  });

  it("maps one-indexed UI pagination to bounded Task and Project list requests", async () => {
    mockApiRequest.mockResolvedValue({
      items: [DTO],
      page: 1,
      size: 20,
      totalItems: 23,
      totalPages: 2,
    });

    await expect(queryComments("TASK", "task-1", 2, 20)).resolves.toEqual({
      items: [DTO],
      page: 2,
      pageSize: 20,
      total: 23,
      totalPages: 2,
    });
    expect(mockApiRequest).toHaveBeenCalledWith("/tasks/task-1/comments?page=1&size=20", {
      method: "GET",
    });

    await queryComments("PROJECT", "project-1", 1, 10);
    expect(mockApiRequest).toHaveBeenLastCalledWith("/projects/project-1/comments?page=0&size=10", {
      method: "GET",
    });
  });

  it("uses plain text create/edit contracts and exact optimistic versions", async () => {
    mockApiRequest.mockResolvedValue(DTO);

    await createComment("TASK", "task-1", UNTRUSTED_BODY);
    await updateComment("PROJECT", "project-1", "comment-1", "Revised", 3);

    expect(mockApiRequest.mock.calls).toEqual([
      [
        "/tasks/task-1/comments",
        { method: "POST", body: { body: UNTRUSTED_BODY, format: "PLAIN_TEXT" } },
      ],
      [
        "/projects/project-1/comments/comment-1",
        {
          method: "PUT",
          body: { body: "Revised", format: "PLAIN_TEXT", version: 3 },
        },
      ],
    ]);
  });

  it("sends the current Comment version through If-Match on permanent delete", async () => {
    mockApiRequest.mockResolvedValue(undefined);

    await deleteComment("TASK", "task-1", "comment-1", 3);

    expect(mockApiRequest).toHaveBeenCalledWith("/tasks/task-1/comments/comment-1", {
      method: "DELETE",
      headers: { "If-Match": "3" },
    });
  });
});
