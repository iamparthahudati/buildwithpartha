import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { listExports, requestDataExport } from "../api/privacyApi";
import type { ExportItem, ExportListResponse } from "../model/privacy";

export const EXPORTS_QUERY_KEY = ["auth", "export", "status"] as const;

export function useDataExports(): UseQueryResult<ExportListResponse, Error> {
  return useQuery({
    queryKey: EXPORTS_QUERY_KEY,
    queryFn: listExports,
  });
}

export function useRequestDataExport(): UseMutationResult<ExportItem, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestDataExport,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EXPORTS_QUERY_KEY });
    },
  });
}
