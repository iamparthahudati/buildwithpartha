import { useState } from "react";
import { Badge, Button, Heading, Text, TextInput, Select } from "@components/ui";
import { EmptyState } from "@components/feedback";
import type { GoalLink, GoalLinkTargetType } from "../model/goal";
import "./goal-linked-work.css";

export interface GoalLinkedWorkListProps {
  readonly links: readonly GoalLink[];
  readonly onAddLink?: (targetType: GoalLinkTargetType, targetId: string) => void;
  readonly onRemoveLink?: (linkId: string) => void;
  readonly className?: string;
}

const TARGET_TYPE_OPTIONS = [
  { value: "PROJECT", label: "Project" },
  { value: "TASK", label: "Task" },
  { value: "HABIT", label: "Habit" },
];

export function GoalLinkedWorkList({
  links,
  onAddLink,
  onRemoveLink,
  className,
}: GoalLinkedWorkListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [targetType, setTargetType] = useState<GoalLinkTargetType>("PROJECT");
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim()) {
      setError("Target ID is required.");
      return;
    }
    setError("");
    onAddLink?.(targetType, targetId.trim());
    setTargetId("");
    setIsAdding(false);
  };

  return (
    <section
      aria-label="Linked work items"
      className={["goal-linked-work", className].filter(Boolean).join(" ")}
    >
      <header className="goal-linked-work__header">
        <Heading level={3} size="sm">
          Linked Work Items ({links.length})
        </Heading>
        {onAddLink && !isAdding ? (
          <Button variant="secondary" size="sm" onClick={() => setIsAdding(true)}>
            Link Work Item
          </Button>
        ) : null}
      </header>

      {isAdding ? (
        <form onSubmit={handleAdd} className="goal-linked-work__add-form">
          <Text size="xs" weight="medium" tone="muted">
            Link a Project, Task, or Habit to this goal
          </Text>
          <div className="goal-linked-work__add-inputs">
            <Select
              label="Link target type"
              labelHidden
              options={TARGET_TYPE_OPTIONS}
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as GoalLinkTargetType)}
            />
            <TextInput
              label="Target ID"
              labelHidden
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Target ID or title reference"
            />
            <Button type="submit" variant="primary" size="sm">
              Add Link
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setError("");
              }}
            >
              Cancel
            </Button>
          </div>
          {error ? (
            <Text size="xs" tone="danger">
              {error}
            </Text>
          ) : null}
        </form>
      ) : null}

      {links.length === 0 ? (
        <EmptyState
          variant="first-use"
          title="No linked work items"
          description="Connect projects, tasks, or habits to drive automatic progress visibility."
          {...(onAddLink && !isAdding
            ? {
                primaryAction: (
                  <Button variant="primary" size="sm" onClick={() => setIsAdding(true)}>
                    Link First Work Item
                  </Button>
                ),
              }
            : {})}
        />
      ) : (
        <ul className="goal-linked-work__list">
          {links.map((link) => (
            <li key={link.id} className="goal-linked-work__item">
              <div className="goal-linked-work__item-info">
                <Badge
                  tone={
                    link.targetType === "PROJECT"
                      ? "primary"
                      : link.targetType === "TASK"
                        ? "info"
                        : "warning"
                  }
                >
                  {link.targetType}
                </Badge>
                <Text size="sm" weight="medium" className="goal-linked-work__title">
                  {link.targetTitle || `ID: ${link.targetId}`}
                </Text>
                {link.targetStatus ? <Badge tone="neutral">{link.targetStatus}</Badge> : null}
              </div>

              {onRemoveLink ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveLink(link.id)}
                  aria-label={`Unlink ${link.targetType.toLowerCase()} ${link.targetTitle || link.targetId}`}
                >
                  Unlink
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
