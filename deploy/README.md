# Deploying Build with Partha to the Hostinger VPS

Goal: everything runs **only on Hostinger** — hosting on the VPS, DNS on Hostinger,
no OpenAI hosting and no Cloudflare. HTTPS is handled by Caddy (Let's Encrypt).

- **VPS:** `srv1883798.hstgr.cloud` — IP `200.141.13.244` (KVM 2, Ubuntu)
- **Docroot:** `/var/www/buildwithpartha/site`
- **Caddy config:** `/etc/caddy/Caddyfile`

This folder contains the ready-to-ship artifacts:

```
deploy/
  site/          → the static "Coming soon" site (upload as the docroot)
  caddy/Caddyfile → the Caddy config for the whole VPS
  README.md      → this runbook
```

---

## Phase A — VPS baseline (one time)

SSH in from your Mac Terminal (`ssh root@200.141.13.244`), then:

```bash
# Update and install Caddy (official APT repo)
apt update && apt -y upgrade
apt -y install debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt -y install caddy

# Firewall: allow SSH + HTTP + HTTPS only
apt -y install ufw
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable
```

---

## Phase B — Ship the static site

From your **Mac** (not the VPS), from the repo root, upload the site and Caddyfile:

```bash
# 1. Create the docroot on the VPS
ssh root@200.141.13.244 'mkdir -p /var/www/buildwithpartha/site'

# 2. Copy the static site up
scp -r deploy/site/* root@200.141.13.244:/var/www/buildwithpartha/site/

# 3. Install the Caddy config
scp deploy/caddy/Caddyfile root@200.141.13.244:/etc/caddy/Caddyfile
```

Then back on the **VPS**:

```bash
caddy validate --config /etc/caddy/Caddyfile   # sanity check
systemctl reload caddy
```

### Test BEFORE touching DNS
The cert won't issue until DNS points here, but you can verify the server answers
using the raw IP with the right Host header:

```bash
curl -H 'Host: buildwithpartha.tech' http://200.141.13.244/ | head
```

You should see the Coming-soon HTML.

---

## Phase C — Move DNS to Hostinger (the "off Cloudflare + off OpenAI" switch)

Right now `buildwithpartha.tech` uses **Cloudflare nameservers** and points at OpenAI.
To move DNS fully to Hostinger:

1. **hPanel → Domains → `buildwithpartha.tech` → DNS / Nameservers.**
2. Change nameservers **from Cloudflare** (`rene/tani.ns.cloudflare.com`) **to Hostinger's**
   (hPanel shows the exact ones, typically `ns1.dns-parking.com` / `ns2.dns-parking.com`).
3. In Hostinger's **DNS Zone editor**, create:
   - `A  @    200.141.13.244`
   - `A  www  200.141.13.244`
   - (remove any old A/AAAA/CNAME that pointed at OpenAI/Cloudflare)

> Nameserver changes can take a few hours to propagate. During that window some
> visitors may still hit the old site — that's expected and harmless.

Once DNS resolves to `200.141.13.244`, Caddy automatically issues the HTTPS
certificate on first request. Verify:

```bash
dig +short buildwithpartha.tech      # should return 200.141.13.244
curl -I https://buildwithpartha.tech # should be 200 with a valid cert
```

---

## Phase D — Retire OpenAI hosting (do this LAST)

Only after `https://buildwithpartha.tech` is confirmed serving from the VPS:

- In the OpenAI/ChatGPT site-creator dashboard, **delete/stop** the deployment for
  project `appgprj_6a758e2162c88191ae5b9d19926e4a85`.

Nothing in the repo needs the OpenAI hosting after this; the `.openai/hosting.json`
file can be removed in a later cleanup commit if desired.

---

## LifeOS (later — Epic 16)

LifeOS is **not yet built for production** (Epic 16 is all backlog: no prod
containers, compose, or Caddy routing). When it's ready, uncomment the `/life-os`
blocks in `deploy/caddy/Caddyfile` and add the compose stack. Track it via the
Epic 16 tickets (LOS-1601 … LOS-1616).
