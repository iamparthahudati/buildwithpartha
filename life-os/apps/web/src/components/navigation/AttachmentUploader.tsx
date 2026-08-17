import { useRef, useState, type ChangeEvent } from "react";
import { Upload } from "lucide-react";

import { InlineMessage } from "@components/feedback";
import { Button } from "@components/ui";

import { formatFileSize, validateAttachmentFile } from "./attachmentValidation";
import "./attachment-uploader.css";

/**
 * AttachmentUploader (LOS-0431).
 *
 * The Files capability itself is `docs/31-PRIVACY-DATA-LIFECYCLE.md`'s one
 * P4 "optional high-risk" feature, off until its own dedicated
 * storage/scanning/quarantine review passes — so `enabled` is a real prop,
 * not a decoration, and defaults to `true` only because most callers already
 * know the feature is on by the time they mount this at all. `false` renders
 * the tone guide's own exact copy for this case rather than hiding silently,
 * since a caller that already decided to show an attachments section still
 * needs to explain why it is empty.
 *
 * This picks files; it does not upload them. Restrictions are checked
 * against whatever the OS file dialog actually returns — its own `accept`
 * filter is a hint the OS is free to ignore — and only files that pass are
 * handed to `onFilesSelected`. Sending bytes anywhere, tracking progress and
 * deciding what "uploading" even means belongs to the caller, the same
 * mechanism/state split `ConfirmDialog`'s `pending` and `TimerRing`'s own
 * ticking already use.
 */

export interface AttachmentUploaderProps {
  readonly label?: string;
  /** MIME types the picker accepts, e.g. `["application/pdf", "image/png"]`. */
  readonly acceptedTypes: readonly string[];
  /** Human-readable form of `acceptedTypes` for the restriction copy, e.g. "PDF or PNG". */
  readonly acceptedTypesLabel: string;
  readonly maxFileSizeBytes: number;
  readonly locale: string;
  readonly multiple?: boolean;
  /** Off until the Files capability review passes; see the component note above. */
  readonly enabled?: boolean;
  readonly disabled?: boolean;
  readonly onFilesSelected: (files: readonly File[]) => void;
  readonly className?: string;
}

export function AttachmentUploader({
  label = "Add attachment",
  acceptedTypes,
  acceptedTypesLabel,
  maxFileSizeBytes,
  locale,
  multiple = true,
  enabled = true,
  disabled = false,
  onFilesSelected,
  className,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasRejection, setHasRejection] = useState(false);

  if (!enabled) {
    return (
      <InlineMessage tone="info" {...(className !== undefined ? { className } : {})}>
        Attachments aren&rsquo;t enabled for LifeOS yet.
      </InlineMessage>
    );
  }

  const restrictionCopy = `Choose a ${acceptedTypesLabel} file up to ${formatFileSize(maxFileSizeBytes, locale)}.`;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    // Cleared immediately so picking the exact same file again still fires
    // a change event next time.
    event.target.value = "";
    if (selected.length === 0) {
      return;
    }

    const accepted: File[] = [];
    let rejected = false;
    for (const file of selected) {
      if (validateAttachmentFile(file, { acceptedTypes, maxFileSizeBytes }).valid) {
        accepted.push(file);
      } else {
        rejected = true;
      }
    }

    setHasRejection(rejected);
    if (accepted.length > 0) {
      onFilesSelected(accepted);
    }
  }

  return (
    <div className={["lifeos-attachment-uploader", className].filter(Boolean).join(" ")}>
      <input
        ref={inputRef}
        type="file"
        className="lifeos-attachment-uploader__input"
        accept={acceptedTypes.join(",")}
        multiple={multiple}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />
      <Button
        variant="secondary"
        iconStart={Upload}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>

      {/*
        One message, escalating tone and announcement only on a genuine
        rejection: the restriction copy the tone guide names for "Unsupported
        file" is identical whether shown as a standing hint or as the reason
        a pick was just rejected, so there is no second sentence to write.
      */}
      <InlineMessage
        tone={hasRejection ? "danger" : "info"}
        announce={hasRejection ? "alert" : "none"}
      >
        {restrictionCopy}
      </InlineMessage>
    </div>
  );
}
