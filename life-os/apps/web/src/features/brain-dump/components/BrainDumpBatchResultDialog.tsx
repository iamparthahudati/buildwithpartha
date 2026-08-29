import { CheckCircle2, XCircle } from "lucide-react";

import { Dialog, InlineMessage } from "@components/feedback";
import { Button, Link, Text } from "@components/ui";

import {
  BRAIN_DUMP_TARGET_LABELS,
  convertedEntityPath,
  type BrainDumpConvertTargetType,
} from "../model/brainDumpItem";
import type { BatchConvertResult } from "../hooks/useBrainDump";
import "./brain-dump-batch-result-dialog.css";

export interface BrainDumpBatchResultDialogProps {
  readonly open: boolean;
  readonly result: BatchConvertResult | null;
  /** Retries only the items that failed — safe thanks to backend idempotency. */
  readonly onRetryFailed?: (ids: readonly string[], target: BrainDumpConvertTargetType) => void;
  readonly retrying?: boolean;
  readonly onClose: () => void;
}

/**
 * Partial batch conversion results (LOS-1206).
 *
 * Each selected item converted or failed independently — this dialog reports
 * both, links to every successfully created entity, and offers a safe retry of
 * only the failures.
 */
export function BrainDumpBatchResultDialog({
  open,
  result,
  onRetryFailed,
  retrying = false,
  onClose,
}: BrainDumpBatchResultDialogProps) {
  if (!result) return null;

  const label = BRAIN_DUMP_TARGET_LABELS[result.target];
  const failedIds = result.results.filter((entry) => !entry.ok).map((entry) => entry.id);
  const tone =
    result.failureCount === 0 ? "success" : result.successCount === 0 ? "danger" : "warning";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Converted ${result.successCount} of ${result.results.length} to ${label}`}
      size="md"
    >
      <div className="lifeos-brain-dump-batch-result">
        <InlineMessage tone={tone}>
          {result.failureCount === 0
            ? `All ${result.successCount} items converted to ${label}.`
            : `${result.successCount} converted, ${result.failureCount} failed. Failed items are unchanged and can be retried.`}
        </InlineMessage>

        <ul className="lifeos-brain-dump-batch-result__list">
          {result.results.map((entry) => (
            <li key={entry.id} className="lifeos-brain-dump-batch-result__item">
              {entry.ok ? (
                <CheckCircle2
                  size={16}
                  className="lifeos-brain-dump-batch-result__icon--ok"
                  aria-hidden="true"
                />
              ) : (
                <XCircle
                  size={16}
                  className="lifeos-brain-dump-batch-result__icon--fail"
                  aria-hidden="true"
                />
              )}
              <span className="lifeos-brain-dump-batch-result__content">
                <Text size="sm">{truncate(entry.content)}</Text>
                {entry.ok && entry.item?.convertedToType && entry.item.convertedToId ? (
                  <Link
                    href={convertedEntityPath(entry.item.convertedToType, entry.item.convertedToId)}
                    inline
                  >
                    Open {label}
                  </Link>
                ) : (
                  !entry.ok && (
                    <Text size="xs" tone="danger">
                      {entry.error ?? "Conversion failed."}
                    </Text>
                  )
                )}
              </span>
            </li>
          ))}
        </ul>

        <div className="lifeos-brain-dump-batch-result__actions">
          {failedIds.length > 0 && onRetryFailed && (
            <Button
              variant="secondary"
              onClick={() => onRetryFailed(failedIds, result.target)}
              disabled={retrying}
            >
              {retrying ? "Retrying…" : `Retry ${failedIds.length} failed`}
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function truncate(content: string): string {
  const trimmed = content.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}
