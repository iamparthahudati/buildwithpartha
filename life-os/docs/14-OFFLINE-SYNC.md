# Offline and sync strategy

## V1 level

LifeOS v1 is online-first with resilient drafts. It does not promise every feature offline.

Supported after the offline tickets land:

- app shell/static cache;
- last-successful read data with stale/offline label;
- local note and brain-dump drafts;
- queued idempotent creation of a task, note, or brain-dump item;
- automatic retry after reconnection with visible queue status.

Online-only: authentication changes, account deletion, attachments, exports, recurrence-series edits, bulk destructive actions, dependency graph edits, and conflict resolution.

## Queue model

Each entry stores local ID, user/session binding, operation type, endpoint/resource, safe payload, idempotency key, entity dependencies, created/expiry timestamps, attempt count, last error, and state. Sensitive queue data is minimized and removed on logout/account switch.

## Conflict model

- Backend version is authoritative.
- Non-overlapping safe changes may be merged only by explicit domain rules.
- Text conflicts preserve both local and server versions.
- Deleted-server versus edited-local requires explicit restore/copy choice.
- Queue replay pauses the affected entity on conflict but may continue unrelated entities.

## UX language

`Saved` means acknowledged by server. `Saved on this device` means local draft only. `Queued — will sync when online` means a pending mutation. `Sync conflict` requires user action.

