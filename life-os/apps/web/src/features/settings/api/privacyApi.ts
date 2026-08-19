import { apiRequest } from "@lib/apiClient";

import type {
  AccountDeletionRequest,
  AccountDeletionResponse,
  ExportItem,
  ExportListResponse,
} from "../model/privacy";

/**
 * Data export and account deletion API calls (LOS-0517, LOS-0518, LOS-0519).
 */

export function listExports(): Promise<ExportListResponse> {
  return apiRequest<ExportListResponse>("/auth/export/status", { method: "GET" });
}

export function requestDataExport(): Promise<ExportItem> {
  return apiRequest<ExportItem>("/auth/export", { method: "POST" });
}

export function deleteAccountApi(
  request: AccountDeletionRequest,
): Promise<AccountDeletionResponse> {
  return apiRequest<AccountDeletionResponse>("/auth/account/delete", {
    method: "POST",
    body: request,
  });
}
