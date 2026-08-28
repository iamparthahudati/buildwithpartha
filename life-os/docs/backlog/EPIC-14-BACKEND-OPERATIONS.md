# EPIC-14 — Backend cross-cutting capabilities

| ID | Ticket | Description and acceptance contract | Depends on | Estimate | Status |
| --- | --- | --- | --- | --- | --- |
| LOS-1401 | Implement rate limiting | Per-IP/account/endpoint policies for auth, search, exports and writes with proxy-aware trusted IP handling, standard response/retry, metrics and tests. | LOS-0213 | S | Backlog |
| LOS-1402 | Implement transactional outbox and mail worker | Transactionally enqueue verification/reset/security mail, retry/backoff/dead-letter, templates, safe logs and local mail catcher. Duplicate delivery is harmless. | LOS-0205 | M | Backlog |
| LOS-1403 | Implement background job framework | Persistent scheduled/async jobs for recurrence, export, cleanup, notifications; leasing/idempotency/retry/dead letter/metrics/admin-safe inspection. | LOS-0205 | M | Done |
| LOS-1404 | Implement product activity and security audit services | Structured event APIs, safe metadata, retention/access, correlation and tests. Sensitive content/token/cookie values are impossible through typed interface. | LOS-0213 | S | Done |
| LOS-1405 | Implement private generated-file lifecycle | Generate/store/authorize/expire/delete exports with signed or authenticated access, quotas, cleanup and notification. No public predictable URLs. | LOS-1403 | M | Done |
| LOS-1406 | Complete OpenAPI and client contract pipeline | Document all endpoints/errors/security/examples, validate spec, generate/check frontend boundary types, flag breaking changes in CI. | LOS-0214 | M | Backlog |
| LOS-1407 | Standardize pagination/filter/sort | Shared validated primitives, maximum page sizes, stable tie breakers, index-aware patterns and uniform problem codes across domains. | LOS-0213 | S | Backlog |
| LOS-1408 | Add idempotency infrastructure | Header/key storage and replay semantics for approved creates/jobs; user+operation scope, expiry, response replay and concurrent duplicate tests. | LOS-0205 | S | Backlog |
| LOS-1409 | Add optimistic concurrency infrastructure | Version/ETag helpers, standard 409/412 problem, safe current-version metadata and integration tests across mutable aggregates. | LOS-0213 | S | Backlog |
| LOS-1410 | Add caching policy | Explicit HTTP/private/no-store rules, query cache headers, ETags where safe, Cloudflare bypass for private API, invalidation and account-isolation tests. | LOS-1409 | S | Backlog |
| LOS-1411 | Add structured logging and tracing | Correlation IDs through proxy/API/jobs, JSON logs, redaction tests, trace/span integration if selected and environment-appropriate sampling. | LOS-0213 | S | Backlog |
| LOS-1412 | Add metrics and alerts contract | Auth/job/API/DB pool/cache/mail/export/business-health metrics with labels that avoid user data and documented alert thresholds. | LOS-1411 | S | Backlog |
| LOS-1413 | Tune database queries and indexes | Capture representative plans for dashboards/search/reports/lists, remove N+1, add measured indexes, set timeouts/pool and performance regression thresholds. | LOS-0607, LOS-1301, LOS-1109 | M | Backlog |
| LOS-1414 | Run backend operations gate | Failure-inject mail/job/DB/cache/storage, verify retries/idempotency/redaction/metrics/OpenAPI/performance, completed Today aggregation and safe degradation. | LOS-1401–LOS-1413, LOS-1415 | M | Backlog |
| LOS-1415 | Complete real-data Today aggregation | Implement and tune every Today provider after projects, tasks, time/focus, sprints/week plans, goals, habits and reviews exist. Metrics reconcile with source screens, partial provider failure is isolated, and no N+1 query or fake recommendation remains. | LOS-0717, LOS-0825, LOS-0918, LOS-1015, LOS-1104, LOS-1214 | L | Backlog |
