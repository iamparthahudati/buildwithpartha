import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckSquare,
  FileText,
  FolderOpen,
  Target,
  type LucideIcon,
} from "lucide-react";

import { Dialog, FormDialog, InlineMessage } from "@components/feedback";
import { FormField } from "@components/forms";
import { Button, Link, Select, Text, TextInput, Textarea } from "@components/ui";

import type { ConvertBrainDumpRequest } from "../api/brainDumpApi";
import {
  BRAIN_DUMP_TARGET_LABELS,
  convertedEntityPath,
  type BrainDumpConvertTargetType,
  type BrainDumpItem,
} from "../model/brainDumpItem";
import {
  GOAL_CADENCE_OPTIONS,
  GOAL_CATEGORY_OPTIONS,
  GOAL_PROGRESS_TYPE_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  buildConvertRequest,
  initialConvertFields,
  type ConvertFormFields,
} from "../model/brainDumpConversion";
import "./brain-dump-convert-dialog.css";

export interface BrainDumpConvertResult {
  readonly type: BrainDumpConvertTargetType;
  readonly id: string;
}

export type BrainDumpConvertSubmit = ConvertBrainDumpRequest & { readonly id: string };

export interface BrainDumpConvertDialogProps {
  readonly open: boolean;
  readonly item: BrainDumpItem | null;
  /** Destination the dialog opens on. Defaults to Task. */
  readonly initialTarget?: BrainDumpConvertTargetType;
  readonly pending?: boolean;
  readonly error?: string | null;
  /** Set once the conversion resolves — drives the result link. */
  readonly result?: BrainDumpConvertResult | null;
  readonly onSubmit: (payload: BrainDumpConvertSubmit) => void;
  readonly onClose: () => void;
}

const TARGET_OPTIONS: readonly { value: BrainDumpConvertTargetType; label: string }[] = [
  { value: "TASK", label: "Task" },
  { value: "NOTE", label: "Note" },
  { value: "PROJECT", label: "Project" },
  { value: "GOAL", label: "Goal" },
];

const TARGET_ICONS: Record<BrainDumpConvertTargetType, LucideIcon> = {
  TASK: CheckSquare,
  NOTE: FileText,
  PROJECT: FolderOpen,
  GOAL: Target,
};

/**
 * Brain Dump conversion workflow dialog (LOS-1206).
 *
 * Lets the user pick a destination, preview and edit the destination-specific
 * fields, and convert — while the original captured text stays visible and
 * preserved. When the conversion resolves (or the item was already converted),
 * the dialog shows a transactional result link to the created entity. Because
 * the backend conversion is idempotent, retrying after a timeout re-uses the
 * existing entity rather than creating a duplicate.
 */
export function BrainDumpConvertDialog({
  open,
  item,
  initialTarget = "TASK",
  pending = false,
  error = null,
  result = null,
  onSubmit,
  onClose,
}: BrainDumpConvertDialogProps) {
  // The parent remounts this dialog per item + destination (via `key`), so the
  // initial state is derived once from props — no reset effect is needed.
  const [target, setTarget] = useState<BrainDumpConvertTargetType>(initialTarget);
  const [fields, setFields] = useState<ConvertFormFields>(() =>
    initialConvertFields(item?.content ?? ""),
  );
  const [dirty, setDirty] = useState(false);

  // An item that is already converted resolves straight to its result link.
  const effectiveResult: BrainDumpConvertResult | null = useMemo(() => {
    if (result) return result;
    if (item && item.status === "CONVERTED" && item.convertedToType && item.convertedToId) {
      return { type: item.convertedToType, id: item.convertedToId };
    }
    return null;
  }, [result, item]);

  if (!item) return null;

  const update = (patch: Partial<ConvertFormFields>) => {
    setFields((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const titleInvalid = fields.title.trim().length === 0;
  const bodyInvalid = target === "NOTE" && fields.body.trim().length === 0;
  const submitDisabled = titleInvalid || bodyInvalid;

  const handleSubmit = () => {
    if (submitDisabled) return;
    const payload = buildConvertPayload(item, target, fields);
    onSubmit(payload);
  };

  // ---- Result state: conversion done, show the transactional result link ----
  if (effectiveResult) {
    const ResultIcon = TARGET_ICONS[effectiveResult.type];
    const label = BRAIN_DUMP_TARGET_LABELS[effectiveResult.type];
    return (
      <Dialog
        open={open}
        onClose={onClose}
        title={`Converted to ${label}`}
        description="The original Brain Dump item is preserved and marked as converted."
        size="sm"
      >
        <div className="lifeos-brain-dump-convert__result">
          <InlineMessage tone="success">
            This thought is now a {label}. The source item stays in your inbox history.
          </InlineMessage>

          <blockquote className="lifeos-brain-dump-convert__source">
            <Text size="sm">{item.content}</Text>
          </blockquote>

          <div className="lifeos-brain-dump-convert__result-actions">
            <Link
              href={convertedEntityPath(effectiveResult.type, effectiveResult.id)}
              className="lifeos-brain-dump-convert__result-link"
            >
              <ResultIcon size={16} aria-hidden="true" />
              Open the new {label}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Button variant="secondary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>
    );
  }

  // ---- Form state: choose destination and edit its fields ----
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Convert Brain Dump item"
      description="Choose what this becomes. Your captured text is preserved."
      submitLabel={`Convert to ${BRAIN_DUMP_TARGET_LABELS[target]}`}
      pendingLabel="Converting…"
      isDirty={dirty}
      pending={pending}
      submitDisabled={submitDisabled}
      {...(error ? { error } : {})}
      discardTitle="Discard this conversion?"
      discardDescription="Your edits here will be lost. The Brain Dump item itself is untouched."
    >
      <div className="lifeos-brain-dump-convert__form">
        <FormField name="convert-target" label="Convert to">
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={target}
              onChange={(event) => {
                setTarget(event.target.value as BrainDumpConvertTargetType);
                setDirty(true);
              }}
              options={TARGET_OPTIONS}
              disabled={pending}
            />
          )}
        </FormField>

        <blockquote
          className="lifeos-brain-dump-convert__source"
          aria-label="Original captured text"
        >
          <Text size="xs" tone="muted">
            From your Brain Dump
          </Text>
          <Text size="sm">{item.content}</Text>
        </blockquote>

        <FormField
          name="convert-title"
          label={target === "PROJECT" ? "Project name" : "Title"}
          {...(titleInvalid ? { error: "Enter a title." } : {})}
        >
          {(fieldProps) => (
            <TextInput
              {...fieldProps}
              value={fields.title}
              onChange={(event) => update({ title: event.target.value })}
              maxLength={500}
              disabled={pending}
            />
          )}
        </FormField>

        {target === "NOTE" && (
          <FormField
            name="convert-body"
            label="Note body"
            {...(bodyInvalid ? { error: "Enter the note body." } : {})}
          >
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                value={fields.body}
                onChange={(event) => update({ body: event.target.value })}
                rows={5}
                disabled={pending}
              />
            )}
          </FormField>
        )}

        {(target === "TASK" || target === "PROJECT" || target === "GOAL") && (
          <FormField name="convert-description" label="Description" required={false}>
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                value={fields.description}
                onChange={(event) => update({ description: event.target.value })}
                rows={3}
                placeholder="Optional details…"
                disabled={pending}
              />
            )}
          </FormField>
        )}

        {(target === "TASK" || target === "PROJECT") && (
          <FormField name="convert-priority" label="Priority">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={fields.priority}
                onChange={(event) => update({ priority: event.target.value })}
                options={TASK_PRIORITY_OPTIONS}
                disabled={pending}
              />
            )}
          </FormField>
        )}

        {target === "GOAL" && (
          <div className="lifeos-brain-dump-convert__grid">
            <FormField name="convert-category" label="Category">
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={fields.category}
                  onChange={(event) => update({ category: event.target.value })}
                  options={GOAL_CATEGORY_OPTIONS}
                  disabled={pending}
                />
              )}
            </FormField>
            <FormField name="convert-progress-type" label="Progress type">
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={fields.progressType}
                  onChange={(event) => update({ progressType: event.target.value })}
                  options={GOAL_PROGRESS_TYPE_OPTIONS}
                  disabled={pending}
                />
              )}
            </FormField>
            <FormField name="convert-cadence" label="Check-in cadence">
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={fields.checkInCadence}
                  onChange={(event) => update({ checkInCadence: event.target.value })}
                  options={GOAL_CADENCE_OPTIONS}
                  disabled={pending}
                />
              )}
            </FormField>
          </div>
        )}
      </div>
    </FormDialog>
  );
}

function buildConvertPayload(
  item: BrainDumpItem,
  target: BrainDumpConvertTargetType,
  fields: ConvertFormFields,
): BrainDumpConvertSubmit {
  switch (target) {
    case "TASK":
      return { id: item.id, target, request: buildConvertRequest("TASK", fields, item.version) };
    case "NOTE":
      return { id: item.id, target, request: buildConvertRequest("NOTE", fields, item.version) };
    case "PROJECT":
      return {
        id: item.id,
        target,
        request: buildConvertRequest("PROJECT", fields, item.version),
      };
    case "GOAL":
      return { id: item.id, target, request: buildConvertRequest("GOAL", fields, item.version) };
    default: {
      const exhaustive: never = target;
      throw new Error(`Unsupported conversion target: ${String(exhaustive)}`);
    }
  }
}
