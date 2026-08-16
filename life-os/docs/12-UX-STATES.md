# UX state matrix

Every screen and data-bearing component must define these states before implementation.

| State | Required behavior |
| --- | --- |
| Initial loading | Preserve layout; show a labelled, non-interactive skeleton or concise progress state. |
| Background refresh | Keep current data; use a subtle updating indicator; never erase the page. |
| First-use empty | Explain value and offer one primary creation action. |
| Filtered empty | Say no records match; show active filters and Clear filters. |
| Search empty | Echo the safe query, suggest adjustment, and offer relevant Quick Add. |
| Partial data | Render successful widgets and isolate the failed region with Retry. |
| Validation error | Mark field, link message, preserve input, focus summary on submit where helpful. |
| Authentication expired | Preserve safe draft, open sign-in recovery, return to the intended route after login. |
| Forbidden | Do not reveal existence/details; provide safe navigation. |
| Not found/deleted | Explain that the record moved or was removed; offer list/restore when authorized. |
| Conflict | Preserve local changes; offer compare/copy/reload, never silently overwrite. |
| Offline | Show offline banner and last synced time; disable unsafe actions; label queued work. |
| Rate limited | Explain temporary limit and retry time without encouraging repeated clicks. |
| Service unavailable | Preserve work, offer Retry, show correlation ID for unexpected failures. |
| Destructive confirmation | Name record, consequence, recovery/retention, and explicit confirm action. |
| Success | Confirm the outcome close to the action; avoid unnecessary modal interruptions. |

Feature tickets may add domain-specific states but may not omit applicable rows.

