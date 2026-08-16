# API source structure

Package root: `tech.buildwithpartha.lifeos`.

Domains: `auth`, `user`, `project`, `task`, `calendar`, `timeblock`, `focus`, `sprint`, `goal`, `note`, `braindump`, `habit`, `report`, `search`, `notification`, `audit`.

Cross-cutting packages: `common` for stable domain-neutral primitives/errors and `config` for Spring configuration. Avoid a global controller/service/repository layout.

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

`common.error.ErrorCode` is the stable machine-readable code value, and `common.error.CodedException` is the base for expected coded failures. Exception messages remain server-side; LOS-0213 maps codes to safe RFC Problem Details.

`common.pagination.PageResponse` is the immutable API pagination envelope. Pages are zero-based and expose `items`, `page`, `size`, `totalItems`, and `totalPages`.

`BackendPackageArchitectureTests` checks production bytecode. `PackageBoundaryRulesTests` contains intentionally invalid test-only fixtures so a broken cross-domain, common, layer-direction, or package-layout dependency is proven to fail.
