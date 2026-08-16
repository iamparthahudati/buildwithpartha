# LifeOS infrastructure

Contains the isolated local PostgreSQL Compose service and reserved areas for production/staging Compose, Caddy routing, backup/restore scripts and monitoring definitions. Infrastructure is implemented ticket-by-ticket; no production secret belongs here.

Start with the [local PostgreSQL guide](./compose/README.md). Local browser/API same-origin routing is provided by the Vite development and preview proxy documented in [`apps/web/README.md`](../apps/web/README.md), so local development does not require Caddy. Production and staging Caddy configuration remains owned by Epic 16.
