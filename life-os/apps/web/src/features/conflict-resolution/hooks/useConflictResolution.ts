/**
 * React Hook for Managing Conflict Resolution Workflows (LOS-1314).
 */

import { useCallback, useState } from "react";
import { buildConflictCopyText, type ConflictDetails } from "../model/conflictContract";

export interface UseConflictResolutionOptions<T = Record<string, unknown>> {
  readonly onUseServer?: ((details: ConflictDetails<T>) => void) | undefined;
  readonly onOverwriteLocal?: ((details: ConflictDetails<T>) => void) | undefined;
  readonly onCopySuccess?: (() => void) | undefined;
}

export function useConflictResolution<T extends Record<string, unknown> = Record<string, unknown>>(
  options: UseConflictResolutionOptions<T> = {},
) {
  const [isOpen, setIsOpen] = useState(false);
  const [details, setDetails] = useState<ConflictDetails<T> | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  const openConflict = useCallback((conflictDetails: ConflictDetails<T>) => {
    setDetails(conflictDetails);
    setIsOpen(true);
    setHasCopied(false);
  }, []);

  const closeConflict = useCallback(() => {
    setIsOpen(false);
  }, []);

  const copyLocalDraft = useCallback(async () => {
    if (!details) return false;
    const text = buildConflictCopyText(details);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setHasCopied(true);
      options.onCopySuccess?.();
      return true;
    } catch {
      setHasCopied(true);
      return false;
    }
  }, [details, options]);

  const resolveUseServer = useCallback(() => {
    if (!details) return;
    options.onUseServer?.(details);
    setIsOpen(false);
  }, [details, options]);

  const resolveOverwriteLocal = useCallback(() => {
    if (!details) return;
    options.onOverwriteLocal?.(details);
    setIsOpen(false);
  }, [details, options]);

  return {
    isOpen,
    details,
    hasCopied,
    openConflict,
    closeConflict,
    copyLocalDraft,
    resolveUseServer,
    resolveOverwriteLocal,
  };
}
