import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateActivityQueries } from "@features/activity";

import {
  createComment,
  deleteComment,
  queryComments,
  updateComment,
  type CommentParentType,
} from "../api/commentsApi";

export const COMMENTS_QUERY_KEY = ["comments"] as const;

export const commentsQueryKeys = {
  all: COMMENTS_QUERY_KEY,
  parent: (parentType: CommentParentType, parentId: string) =>
    [...COMMENTS_QUERY_KEY, parentType, parentId] as const,
  page: (parentType: CommentParentType, parentId: string, page: number, pageSize: number) =>
    [...commentsQueryKeys.parent(parentType, parentId), "page", page, pageSize] as const,
};

export function useComments(
  parentType: CommentParentType,
  parentId: string,
  page: number,
  pageSize: number,
  enabled = true,
) {
  return useQuery({
    queryKey: commentsQueryKeys.page(parentType, parentId, page, pageSize),
    queryFn: ({ signal }) => queryComments(parentType, parentId, page, pageSize, signal),
    enabled: Boolean(parentId) && enabled,
    staleTime: 15_000,
  });
}

export function useCommentMutations(parentType: CommentParentType, parentId: string) {
  const queryClient = useQueryClient();
  const refreshComments = () => {
    void queryClient.invalidateQueries({
      queryKey: commentsQueryKeys.parent(parentType, parentId),
    });
    void invalidateActivityQueries(queryClient);
  };

  const add = useMutation({
    mutationFn: (body: string) => createComment(parentType, parentId, body),
    onSuccess: refreshComments,
  });
  const edit = useMutation({
    mutationFn: ({ id, body, version }: { id: string; body: string; version: number }) =>
      updateComment(parentType, parentId, id, body, version),
    onSuccess: refreshComments,
  });
  const remove = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      deleteComment(parentType, parentId, id, version),
    onSuccess: refreshComments,
  });

  return { add, edit, remove } as const;
}
