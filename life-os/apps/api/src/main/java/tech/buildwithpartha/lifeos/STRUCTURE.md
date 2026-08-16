# API source structure

Package root: `tech.buildwithpartha.lifeos`.

Domains: `auth`, `user`, `project`, `task`, `calendar`, `timeblock`, `focus`, `sprint`, `goal`, `note`, `braindump`, `habit`, `report`, `search`, `notification`, `audit`.

Cross-cutting packages: `common` for stable domain-neutral primitives/errors and `config` for Spring configuration. Avoid a global controller/service/repository layout.

The `config` package owns early process-environment validation, typed Spring configuration binding, HTTP correlation, safe API failure mapping and cross-cutting security/actuator policy. Runtime validation reports key names only and completes before service or persistence beans are created.

Within a domain, add layers only when used:

```text
domain/
application/
api/
infrastructure/
```

Controllers accept/return API records, application services own transactions, domain code holds rules, and infrastructure owns JPA/external adapters. Domain dependency rules are enforced by architecture tests.

## Dependency direction

Domain packages do not depend directly on one another. Cross-domain collaboration uses domain-neutral contracts, identifiers, or events in `common`; `config` may wire implementations together without moving orchestration into configuration.

Within each domain, dependencies point inward:

```text
api ------------> application ----> domain
                         ^              ^
                         |              |
infrastructure ----------+--------------+

all layers -------------> common
config -----------------> domain packages and common (wiring only)
```

- `domain` does not depend on `application`, `api`, `infrastructure`, `config`, Spring, or JPA.
- `application` does not depend on `api` or `infrastructure`.
- `api` and `infrastructure` are sibling adapters and do not depend on each other.
- `common` does not depend on any domain or on `config`.
- Domain subpackages are limited to `api`, `application`, `domain`, and `infrastructure`; add only the layers a domain actually uses.

`common.error.ErrorCode` is the stable machine-readable code value, and `common.error.CodedException` is the base for expected coded failures. `common.error.ApiProblem` and `FieldProblem` define the versioned public response shape. Exception messages and rejected values remain server-side; `config` maps failures to safe Problem Details with the request correlation ID.

`common.pagination.PageResponse` is the immutable API pagination envelope. Pages are zero-based and expose `items`, `page`, `size`, `totalItems`, and `totalPages`.

`BackendPackageArchitectureTests` checks production bytecode. `PackageBoundaryRulesTests` contains intentionally invalid test-only fixtures so a broken cross-domain, common, layer-direction, or package-layout dependency is proven to fail.

## Quality gate

`./gradlew check` is the backend merge gate. It enforces Spotless formatting, Checkstyle static rules, the JUnit/AssertJ test suite, the ArchUnit rules above, and JaCoCo line and branch coverage at a minimum of 80%. HTML reports are written beneath `build/reports/`.

PostgreSQL integration tests should obtain their pinned, isolated container from `PostgreSqlTestContainerFactory` in test support. Tests that start the container require Docker; unit, context, and architecture tests do not.
