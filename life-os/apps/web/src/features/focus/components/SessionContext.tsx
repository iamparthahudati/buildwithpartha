import { CalendarClock, ListTodo } from "lucide-react";

import { Icon, Link, Surface, Text } from "@components/ui";

export interface FocusSessionContext {
  readonly task?: {
    readonly title: string;
    readonly href?: string;
  };
  readonly timeBlock?: {
    readonly title: string;
    readonly localTime: string;
    readonly href?: string;
  };
}

export interface SessionContextProps {
  readonly context?: FocusSessionContext;
}

function ContextValue({ title, href }: { readonly title: string; readonly href?: string }) {
  return href ? <Link href={href}>{title}</Link> : <Text weight="medium">{title}</Text>;
}

export function SessionContext({ context }: SessionContextProps) {
  if (!context?.task && !context?.timeBlock) {
    return (
      <Surface as="section" title="Session context" tone="muted" padding="sm">
        <Text size="sm" tone="secondary">
          This Focus Session is not linked to a Task or Time Block.
        </Text>
      </Surface>
    );
  }

  return (
    <Surface as="section" title="Session context" tone="muted" padding="sm">
      <dl className="lifeos-focus-mode__context-list">
        {context.task ? (
          <div className="lifeos-focus-mode__context-item">
            <dt>
              <Icon icon={ListTodo} decorative size="sm" />
              Task
            </dt>
            <dd>
              <ContextValue
                title={context.task.title}
                {...(context.task.href ? { href: context.task.href } : {})}
              />
            </dd>
          </div>
        ) : null}
        {context.timeBlock ? (
          <div className="lifeos-focus-mode__context-item">
            <dt>
              <Icon icon={CalendarClock} decorative size="sm" />
              Time Block
            </dt>
            <dd>
              <ContextValue
                title={context.timeBlock.title}
                {...(context.timeBlock.href ? { href: context.timeBlock.href } : {})}
              />
              <Text size="xs" tone="secondary">
                {context.timeBlock.localTime}
              </Text>
            </dd>
          </div>
        ) : null}
      </dl>
    </Surface>
  );
}
