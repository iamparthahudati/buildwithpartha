# EPIC-17 — Controlled future discovery

These are discovery tickets only. They do not enter `Ready` until v1 evidence supports them and the owner approves scope.

| ID | Ticket | Description and acceptance contract | Depends on |
| --- | --- | --- | --- |
| LOS-1701 | Discover external calendar sync | Evaluate providers, OAuth/token security, two-way conflict semantics, recurrence/timezone mapping, quotas and disconnect/delete behavior; produce ADR and prototype plan, not production code. | Production evidence |
| LOS-1702 | Discover full offline-first mode | Evaluate IndexedDB data model, encryption, sync protocol, conflicts, migrations, multi-device and storage limits. Define honest support boundary/cost. | LOS-1316 |
| LOS-1703 | Discover teams/workspaces | Research workspace ownership, roles, invitations, assignment/sharing/comments/mentions, audit and migration from user ownership. Include authorization matrix and pricing implications. | Production evidence |
| LOS-1704 | Discover AI task breakdown | Complete `15-AI-FUTURE.md` prerequisites for selected-text checklist proposals; provider/data/retention/threat/cost/diff/confirm/undo and non-AI fallback. | Production evidence |
| LOS-1705 | Discover AI planning suggestions | Evaluate explicit-input daily/weekly plan proposals, constraint transparency, no silent scheduling, evaluation dataset, safety/privacy/cost. | LOS-1704 |
| LOS-1706 | Discover natural-language search | Compare local/hosted embeddings and retrieval, account isolation, deletion, prompt injection, relevance evaluation and exact keyword fallback. | LOS-1704 |
| LOS-1707 | Discover native mobile/PWA expansion | Use production analytics/interviews to decide enhanced PWA versus native; notifications/offline/background timer/platform accessibility included. | Production evidence |
| LOS-1708 | Discover automation and public API | Define safe rules/webhooks/API tokens/scopes/rate limits/audit/replay and user-controlled failure handling. No generic code execution. | Production evidence |

