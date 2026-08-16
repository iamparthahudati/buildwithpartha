import { forwardRef, useContext, useId } from "react";

import { Heading } from "@components/ui";

import { FormFieldErrorsContext } from "./formFieldRegistry";
import "./form-error-summary.css";

/**
 * FormErrorSummary (LOS-0401).
 *
 * Lists every field currently registered with an error inside the enclosing
 * `FormFieldGroup`, each one a button that moves keyboard focus to its field.
 * `docs/30-CONTENT-AND-TONE-GUIDE.md` requires this pattern on submit and is
 * explicit about the choreography: the summary appears and takes focus only
 * after a failed submit, never while the user is still typing. That timing
 * decision belongs to whichever form owns the submit handler, which is why
 * this component neither renders itself unconditionally nor grabs focus on
 * its own — the caller renders it once there is something to summarize, and
 * calls the forwarded ref's `.focus()` right after.
 *
 * `tabIndex={-1}` makes it a valid focus target without adding a stray tab
 * stop, the same pattern the skip link already uses for the main landmark.
 */

export interface FormErrorSummaryProps {
  readonly title?: string;
  readonly className?: string;
}

export const FormErrorSummary = forwardRef<HTMLDivElement, FormErrorSummaryProps>(
  function FormErrorSummary({ title = "Fix the following before continuing", className }, ref) {
    const errors = useContext(FormFieldErrorsContext);
    const titleId = useId();

    if (errors.length === 0) {
      return null;
    }

    return (
      <div
        ref={ref}
        // Assertive: this only renders at the moment a submit has already
        // failed, which is exactly when an interruption is warranted — unlike
        // an inline field error, which stays polite because it usually
        // arrives after the user has already moved on.
        role="alert"
        // Every LifeOS field error is also role="alert"; without its own name
        // the summary would be indistinguishable from any one of them to
        // anything that looks up an alert by name rather than by position.
        aria-labelledby={titleId}
        tabIndex={-1}
        className={["lifeos-form-error-summary", className].filter(Boolean).join(" ")}
      >
        <Heading level={2} size="sm" tone="danger" id={titleId}>
          {title}
        </Heading>

        <ul className="lifeos-form-error-summary__list">
          {errors.map((field) => (
            <li key={field.id}>
              <button
                type="button"
                className="lifeos-form-error-summary__link"
                onClick={() => {
                  const target = document.getElementById(field.id);
                  target?.focus();
                  target?.scrollIntoView({ block: "center" });
                }}
              >
                {field.error}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  },
);
