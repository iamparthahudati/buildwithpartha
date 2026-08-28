import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { buildCsvDownloadUrl, requestCsvExport } from "../api/csvExportApi";
import type { CsvExportParams, CsvExportResponse } from "../api/csvExportApi";

/**
 * Mutation hook for triggering a CSV report export (LOS-1111).
 *
 * On success the hook automatically triggers a browser-native file download
 * via a hidden anchor element using the short-lived token URL. The token TTL
 * is 15 minutes; the download is initiated immediately so normal use never
 * approaches the expiry boundary.
 */
export function useExportCsv(): UseMutationResult<CsvExportResponse, Error, CsvExportParams> {
  return useMutation<CsvExportResponse, Error, CsvExportParams>({
    mutationFn: (params: CsvExportParams) => requestCsvExport(params),
    onSuccess: (data: CsvExportResponse) => {
      // Trigger browser-native file download using the private token URL.
      // The session cookie is included automatically (same-origin GET).
      const downloadUrl = buildCsvDownloadUrl(data.downloadToken);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = data.fileName;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    },
  });
}
