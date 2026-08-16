import { AlertCircle } from "lucide-react";

import { Icon } from "./Icon";
import "./field.css";

interface FieldMessagesProps {
  readonly description?: string;
  readonly descriptionId?: string | undefined;
  readonly error?: string;
  readonly errorId?: string | undefined;
}

/**
 * The description and error lines beneath a control.
 *
 * The error is announced politely rather than assertively: validation usually
 * arrives after the user has finished typing, and an assertive live region
 * would interrupt whatever they are doing next.
 */
export function FieldMessages({ description, descriptionId, error, errorId }: FieldMessagesProps) {
  return (
    <>
      {description ? (
        <span id={descriptionId} className="lifeos-field__description">
          {description}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="lifeos-field__error" role="alert">
          <Icon icon={AlertCircle} decorative size="sm" />
          {error}
        </span>
      ) : null}
    </>
  );
}
