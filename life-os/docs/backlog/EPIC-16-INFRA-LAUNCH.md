# EPIC-16 — VPS, Cloudflare, deployment, and launch

| ID | Ticket | Description and acceptance contract | Depends on |
| --- | --- | --- | --- |
| LOS-1601 | Inventory and harden VPS | Record OS/resources/storage/network, create least-privilege deploy user, SSH key policy, firewall, updates, time sync, fail2ban/alternative and emergency access. No app deploy yet. | LOS-0008 |
| LOS-1602 | Define production configuration/secrets | Inventory values, secret generation/storage/rotation/owners and staging separation. Validate presence without logging; backups include required recovery material securely. | LOS-1601, LOS-0211 |
| LOS-1603 | Build production containers | Multi-stage pinned images for web/API, non-root, health checks, read-only/capabilities/resource limits where practical, SBOM and reproducible builds. | LOS-0216 |
| LOS-1604 | Build production Compose and Caddy routing | Web/API/Postgres/private networks/volumes, `/life-os` SPA fallback, `/life-os/api` proxy, headers/compression/request limits/logs. Existing root website remains reachable. | LOS-1603 |
| LOS-1605 | Create staging environment | Separate URL/data/secrets/volumes, production-like routing and safe test mail/files. Deploy candidate and run migrations/smoke without production impact. | LOS-1604 |
| LOS-1606 | Configure Cloudflare DNS/proxy/TLS | Proxied record, Full (strict), origin certificate/tunnel decision, cache bypass for private/API/auth, WAF/rate rules and origin restriction. Validate no direct origin bypass. | LOS-1604 |
| LOS-1607 | Create deployment pipeline | Build/test/scan, immutable image/tag, staging deploy/smoke, approval, production deploy from tagged `master`, migration ordering, deployment record and secret-safe logs. | LOS-1602, LOS-1603, LOS-1605 |
| LOS-1608 | Implement PostgreSQL backup/restore | Automated encrypted nightly backups, off-VPS copy, retention, monitoring, restore script and documented full/partial recovery. Backup failure alerts. | LOS-1604 |
| LOS-1609 | Implement application data/file backup | Cover attachment/export metadata/object storage if enabled; document what is transient, retention, consistency and restore ordering with DB. | LOS-1310, LOS-1608 |
| LOS-1610 | Add monitoring and alerting | External uptime plus origin/API readiness, TLS expiry, 5xx/latency, DB/disk/CPU/memory, job/mail/backup age; actionable routing/runbooks. | LOS-1412, LOS-1604 |
| LOS-1611 | Add centralized safe logs | Rotation/retention, protected access, correlation search, redaction verification and disk-pressure protection. Logs cannot expose user content/secrets. | LOS-1411, LOS-1604 |
| LOS-1612 | Write deployment/rollback runbooks | Normal deploy, failed migration, bad app, DB restore, Cloudflare bypass/emergency, certificate, secrets rotation and owner/contact paths. Commands have target checks. | LOS-1607–LOS-1611 |
| LOS-1613 | Rehearse release and rollback | Deploy a release candidate to staging, migrate, smoke, roll back app, test compatible DB strategy and record timings/gaps. | LOS-1612 |
| LOS-1614 | Prepare production domain and legal pages | `/life-os`, auth/legal/error routes, canonical/security contact/privacy/terms copy, robots policy for private app and correct asset base. | LOS-0113, LOS-0603 |
| LOS-1615 | Execute production launch | Merge approved `develop` to `master`, tag, deploy exact artifact, run non-destructive smoke/security/TLS/monitoring checks and record release. | LOS-1515, LOS-1613, LOS-1614 |
| LOS-1616 | Complete post-launch verification | Observe errors/performance/jobs/backups for defined window, fix or rollback per thresholds, verify first backup and owner journeys, close release with known follow-ups. | LOS-1615 |

