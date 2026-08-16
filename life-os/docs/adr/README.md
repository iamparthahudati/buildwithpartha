# Architecture decision records

Create `ADR-NNN-short-title.md` from [ADR-TEMPLATE.md](./ADR-TEMPLATE.md) before implementing a material decision or deviation. Status values: Proposed, Accepted, Superseded, Rejected.

## Numbering and workflow

1. Reserve the next unused three-digit number; numbers are never reused.
2. Commit the ADR as Proposed on the ticket branch before dependent implementation.
3. Review product, security, privacy, migration, operations and rollback consequences.
4. Change to Accepted or Rejected with date/owner. Implementation may rely only on Accepted decisions.
5. Never rewrite a material historical decision. A replacement ADR marks the old record Superseded and links both directions.
6. Add the compact outcome to `docs/10-DECISIONS.md` and link the ADR from affected permanent docs/tickets.

## ADR required when

- changing locked stack, auth/session, URL, data ownership, time model, database or deployment boundaries;
- adopting a major dependency/platform/provider;
- introducing external data transfer, files, AI, teams, offline sync or a public API;
- making a security/privacy tradeoff or accepting a known risk;
- introducing a migration/operational pattern that later tickets must follow.

Small implementation details that do not create a durable cross-ticket constraint stay in the ticket/handoff rather than becoming ADR noise.

