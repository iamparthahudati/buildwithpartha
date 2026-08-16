# API source structure

Package root: `tech.buildwithpartha.lifeos`.

Domains: `auth`, `user`, `project`, `task`, `calendar`, `timeblock`, `focus`, `sprint`, `goal`, `note`, `braindump`, `habit`, `report`, `search`, `notification`, `audit`.

Cross-cutting packages: `common` for stable public primitives/errors and `config` for Spring configuration. Avoid a global controller/service/repository layout.

Within a domain, add layers only when used:

```text
domain/
application/
api/
infrastructure/
```

Controllers accept/return API records, application services own transactions, domain code holds rules, and infrastructure owns JPA/external adapters. Domain dependency rules are enforced by architecture tests.

