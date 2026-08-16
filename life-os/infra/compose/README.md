# LifeOS local PostgreSQL

This Compose project runs only the disposable local LifeOS database. It does not configure production, the VPS, Cloudflare or the main `buildwithpartha.tech` application.

## Requirements

- Docker Desktop or Docker Engine
- Docker Compose v2 (`docker compose`)

The current Mac does not yet have Docker installed. Install/start Docker before using these commands.

LOS-0216 therefore ran its disposable database/API/web smoke with the installed native PostgreSQL tools rather than claiming the Compose image was exercised. That gate validates role creation, migrations, application readiness and cleanup without touching the normal local volume; it does not replace this PostgreSQL 18.4 Compose contract. Run the commands below when Docker becomes available and again before container/deployment gates.

## Start and verify

From the repository root:

```bash
docker compose --env-file life-os/infra/compose/.env.example \
  -f life-os/infra/compose/compose.local.yml up -d postgres

docker compose --env-file life-os/infra/compose/.env.example \
  -f life-os/infra/compose/compose.local.yml ps

docker compose --env-file life-os/infra/compose/.env.example \
  -f life-os/infra/compose/compose.local.yml exec -T postgres \
  pg_isready -U lifeos_local_admin -d lifeos_local
```

The database is reachable from host-run API development only at `127.0.0.1:55432`. Port `5432` is deliberately avoided because it is already in use on the current development machine. To choose another loopback port, copy `.env.example` to an ignored `.env` file and change only `LIFEOS_POSTGRES_PORT`.

Application connection values are:

```dotenv
DATABASE_URL=jdbc:postgresql://localhost:55432/lifeos_local
DATABASE_USERNAME=lifeos_local_app
DATABASE_PASSWORD=lifeos_local_app_only
FLYWAY_DATABASE_URL=jdbc:postgresql://localhost:55432/lifeos_local
FLYWAY_DATABASE_USERNAME=lifeos_local_migrator
FLYWAY_DATABASE_PASSWORD=lifeos_local_migrator_only
```

The migration role owns the private `lifeos_internal` history schema and may create approved migration objects. The application role cannot create databases, schemas, roles, replication slots or superuser privileges and cannot read Flyway history. The local admin credential initializes the container and is not used by the API.

## Stop or reset

Stop the service without deleting local data:

```bash
docker compose --env-file life-os/infra/compose/.env.example \
  -f life-os/infra/compose/compose.local.yml down
```

Reset is destructive. After confirming that `life-os-local-postgres-data` is the intended disposable local volume, remove only this Compose project's containers, network and volume, then start it again:

```bash
docker compose --env-file life-os/infra/compose/.env.example \
  -f life-os/infra/compose/compose.local.yml down --volumes --remove-orphans

docker compose --env-file life-os/infra/compose/.env.example \
  -f life-os/infra/compose/compose.local.yml up -d postgres
```

Never load production data into this volume. PostgreSQL schema creation remains owned by Flyway in LOS-0205; this ticket creates only the database and local roles.
