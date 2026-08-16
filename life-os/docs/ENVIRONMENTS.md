# LifeOS environment inventory

No secret values belong in this document.

| Environment | Purpose | UI/API | Data | Access and owner |
| --- | --- | --- | --- | --- |
| Local | Individual development and fast tests | UI `http://localhost:5173/life-os/`; API through same-origin local gateway at `/life-os/api/v1` | Disposable PostgreSQL volume and deterministic fixtures; local mail catcher | Developer machine; Partha |
| Test/CI | Automated isolated verification | Ephemeral internal URLs | Fresh PostgreSQL container per suite/job; synthetic data only | CI workload identity; repository owner |
| Staging | Production-like release, migration and security validation | Dedicated hostname/path to be chosen before LOS-1605; never production URL | Separate database, storage, mail sandbox and secrets; synthetic test users only | Restricted owner/test access; Partha |
| Production | Real LifeOS private application | `https://buildwithpartha.tech/life-os`; API `/life-os/api/v1` | Real private user data in VPS PostgreSQL/private object store if enabled | Cloudflare -> hardened VPS; Partha |

## Separation rules

- No environment shares database, volume, encryption/signing key, session secret, SMTP credentials, object bucket/prefix or backup namespace with production.
- Production data is not copied to local, CI or staging by default. Any future diagnostic copy requires a documented, minimized and sanitized process with deletion deadline.
- Test/staging email uses a mail catcher or provider sandbox and cannot deliver to arbitrary real recipients.
- Browser builds contain only public configuration. Backend secrets exist only in environment/secret stores.
- Cloudflare production rules and origin credentials are distinct from staging where the provider supports it.
- Local convenience settings such as insecure cookies cannot be accepted in staging/production profiles.

## Configuration classes

### Public frontend values

- application base path and API base path;
- release/version identifier;
- explicitly public feature flags and support/legal links.

These values are not secrets and may appear in the client bundle.

### Backend secrets

- database password;
- session/token pepper or signing/encryption material as selected;
- SMTP credentials;
- object-storage credentials when enabled;
- monitoring/alert credentials;
- backup encryption and destination credentials;
- Cloudflare deploy/origin credentials where automation requires them.

### Backend non-secret configuration

- public URL and trusted proxy/origin settings;
- session duration/cookie policy;
- rate limits and quotas;
- mail sender/domain;
- job schedules, retention periods and feature flags;
- logging/metrics endpoints without credentials.

## Ownership and readiness

| Area | Owner | Must be resolved by |
| --- | --- | --- |
| Stable dependency versions | Engineering owner | Resolved by LOS-0203; future changes follow `DEPENDENCY-POLICY.md` |
| Local PostgreSQL port and Compose names | Engineering owner | Resolved by LOS-0204: loopback `55432`, project `life-os-local` |
| Local same-origin UI/API gateway ports | Engineering owner | Resolved by LOS-0210: browser/Vite `5173`, API upstream `8080`, preview `4173` |
| Staging hostname and access | Partha | LOS-1605 |
| VPS OS/resources/deploy user | Partha | LOS-1601 |
| Cloudflare zone/API/origin path | Partha | LOS-1606 |
| SMTP provider/sending domain | Partha | Before LOS-0503 staging verification |
| Backup destination/retention/RPO/RTO | Partha | LOS-1608 |
| Monitoring/alert destination | Partha | LOS-1610 |

## Secret lifecycle

Each production/staging secret needs owner, purpose, environment, creation date, storage location, consumers, rotation method, last/next rotation, revocation procedure and incident contact. Rotation must support overlap where zero-downtime consumers require it. Logs and deployment output never print values.

## Data retention summary

- Local/CI: disposable; clear after task/job unless retained temporarily for a named failing test.
- Staging: synthetic; resettable; attachments/exports/jobs follow short test retention.
- Production: follows privacy/data lifecycle, audit, export, deletion and backup policies approved in dedicated tickets.
