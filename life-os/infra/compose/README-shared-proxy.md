# LifeOS deploy on the shared VPS (behind the existing caddy-docker-proxy)

The production box `srv1883798` already runs `proxy-caddy-1` (caddy-docker-proxy on
the `edge` network) fronting the marketing site (`buildwithpartha.tech`) and
`rntoolbox`. LifeOS is added **alongside** them with
[`compose.prod.shared-proxy.yml`](./compose.prod.shared-proxy.yml) — no second
Caddy, no `:80/:443` collision. Routing is by label:

| Path | Container |
| --- | --- |
| `/life-os/api/*` | `lifeos-api:8080` |
| `/life-os/*` | `lifeos-web:8080` |
| everything else | marketing site (unchanged) |

## One-time prerequisites (on the VPS, as root)

1. Repo is cloned at `/opt/lifeos` (deploy key `lifeos-vps-deploy`).
2. Generate the secrets file:
   ```
   cd /opt/lifeos
   sh life-os/scripts/generate-production-secrets.sh
   ```

## Deploy

```
cd /opt/lifeos
docker compose -f life-os/infra/compose/compose.prod.shared-proxy.yml up -d --build
```

`postgres` starts first, `api` runs Flyway migrations on boot, then `web`.
Starting the containers makes caddy-docker-proxy pick up the labels and reload
automatically.

## Validate (do this immediately after `up`)

```
# 1. The live homepage must STILL work (proves the marketing route was not broken):
curl -sI https://buildwithpartha.tech/            | head -1     # expect 200

# 2. LifeOS routes:
curl -sI https://buildwithpartha.tech/life-os/    | head -1     # expect 200
curl -fsS https://buildwithpartha.tech/life-os/api/v1/actuator/health   # expect {"status":"UP"}

# 3. Inspect the merged proxy config if anything looks off:
docker exec proxy-caddy-1 wget -qO- http://localhost:2019/config/ | head -c 2000
```

## Rollback (instant, total)

Because the `/life-os` routing lives only on the LifeOS containers' labels,
removing them reverts the proxy to exactly its previous state:

```
cd /opt/lifeos
docker compose -f life-os/infra/compose/compose.prod.shared-proxy.yml down
```

The postgres volume `lifeos-prod-postgres-data` persists across `down`/`up`.
To also discard the database, add `-v` (destroys all LifeOS data).

## Still outstanding after this

- **Cloudflare cache rules** for `/life-os/api/*` and `/life-os/app/*` (bypass cache)
  per `docs/40-CLOUDFLARE-DNS-PROXY-AND-TLS.md`.
- **SMTP**: the secrets file ships a placeholder; outbound mail (e.g. email
  verification) will not work until pointed at a real server.
- **Backups/monitoring** stacks are separate compose files and not started here.
