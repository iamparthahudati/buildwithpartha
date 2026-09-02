# LifeOS VPS inventory and hardening specification

- Status: Accepted
- Date: 2026-09-02
- Ticket: [LOS-1601](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/backlog/EPIC-16-INFRA-LAUNCH.md)
- Depends on: [LOS-0008](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/ENVIRONMENTS.md)

---

## 1. Overview and scope

This document defines the baseline infrastructure inventory, operating environment, and security hardening policy for the LifeOS single-tenant production Virtual Private Server (VPS). 

In accordance with [AGENTS.md](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/AGENTS.md) and [ADR-011](file:///Users/parthahudati/Workspace/Website/buildwithpartha/life-os/docs/adr/ADR-011-MAIN-SITE-LIFEOS-BOUNDARY.md), LifeOS runs on a dedicated VPS origin behind Cloudflare. This specification covers server sizing, operating system baseline, user privilege boundaries, SSH authentication security, firewall rules (UFW), automated security patching, time synchronization, fail2ban intrusion prevention, emergency serial console access, and compliance auditing.

---

## 2. Hardware and OS inventory

| Attribute | Baseline Specification | Policy & Details |
| --- | --- | --- |
| **Provider** | Cloud VPS Provider (KVM-based) | Private isolated compute instance |
| **Operating System** | Ubuntu 24.04 LTS (Noble Numbat) x86_64 | Long Term Support (5 years security updates) |
| **CPU** | 2 vCPUs | Dedicated or high-priority shared compute |
| **Memory (RAM)** | 4 GB ECC / Standard RAM | Accommodates Spring Boot API, Caddy, PostgreSQL, and background jobs |
| **Storage** | 80 GB NVMe SSD | Ext4 filesystem, root `/` partition with sub-directories for Docker and attachments |
| **Timezone** | UTC (`Etc/UTC`) | Mandatory system timezone setting (`timedatectl set-timezone UTC`) |
| **Network Interfaces** | Single IPv4 + IPv6 Dual Stack | Inbound traffic strictly limited via UFW / Cloudflare proxy |

---

## 3. User privilege architecture

To strictly enforce least privilege and prevent host compromise:

1. **Root Account Lock**:
   - `root` direct SSH login disabled (`PermitRootLogin no`).
   - `root` password locked (`passwd -l root`).

2. **Deploy User (`lifeos-deploy`)**:
   - Created as a dedicated non-root service/deploy user: `useradd -m -s /bin/bash lifeos-deploy`.
   - Member of `docker` group for managing application containers without requiring full root privileges.
   - Sudo access restricted to passwordless invocation of specific maintenance commands via `/etc/sudoers.d/lifeos-deploy`:
     - `/usr/bin/systemctl reload caddy`
     - `/usr/bin/ufw status`
     - `/usr/bin/docker compose *`

3. **Owner Admin User (`partha`)**:
   - Individual admin user account for system administration and maintenance.
   - Member of `sudo` group with key-based authentication.

---

## 4. SSH hardening policy

SSH daemon configuration is deployed to `/etc/ssh/sshd_config.d/lifeos-hardening.conf`:

```ini
# LifeOS SSH Hardening Configuration
Port 22
Protocol 2
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
MaxAuthTries 3
MaxSessions 2
ClientAliveInterval 300
ClientAliveCountMax 2
UsePAM yes
AcceptEnv LANG LC_*

# Modern Ciphers & Key Exchange Algorithms
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
```

### SSH Key Policy
- Allowed Key Types: Ed25519 (preferred) or RSA 4096-bit minimum.
- ECDSA and RSA < 4096-bit keys are prohibited.
- Passphrase protection is required for all stored private keys.

---

## 5. Firewall policy (UFW)

Uncomplicated Firewall (UFW) is configured with a default-deny inbound strategy:

```bash
# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allowed inbound ports
ufw allow 22/tcp comment 'SSH Administration'
ufw allow 80/tcp comment 'HTTP (ACME / Redirect)'
ufw allow 443/tcp comment 'HTTPS (Caddy / Cloudflare Origin)'

# Enable firewall
ufw --force enable
```

### Cloudflare Origin Protection
In LOS-1606, direct origin bypass prevention will restrict ports 80/443 inbound strictly to Cloudflare's published IPv4/IPv6 address ranges (`https://www.cloudflare.com/ips/`).

---

## 6. Automatic security updates

Unattended upgrades ensure prompt installation of security patches without manual intervention.

### Setup Configuration (`/etc/apt/apt.conf.d/20auto-upgrades`):
```apt
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
```

### Policy (`/etc/apt/apt.conf.d/50unattended-upgrades`):
- Package origins restricted to `${distro_id}:${distro_codename}-security`.
- Automatic reboot enabled for kernel patches: `Unattended-Upgrade::Automatic-Reboot "true";`.
- Automatic reboot window scheduled at low-traffic time: `Unattended-Upgrade::Automatic-Reboot-Time "03:00";`.

---

## 7. Time synchronization

Accurate system time is critical for session verification, audit logging, and TLS validation:

- Timezone: `UTC`.
- Synchronizer: `systemd-timesyncd` or `chrony`.
- Configuration (`/etc/systemd/timesyncd.conf`):
  ```ini
  [Time]
  NTP=0.ubuntu.pool.ntp.org 1.ubuntu.pool.ntp.org 2.ubuntu.pool.ntp.org 3.ubuntu.pool.ntp.org
  FallbackNTP=ntp.ubuntu.com
  ```
- Verification command: `timedatectl status` (must report `NTP service: active` and `System clock synchronized: yes`).

---

## 8. Fail2ban intrusion prevention

Fail2ban is installed to monitor SSH logs and block brute-force authentication attempts.

### Configuration (`/etc/fail2ban/jail.d/lifeos-sshd.conf`):
```ini
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
findtime = 600
bantime = 86400
banaction = ufw
```

- Max Retries: 3 failed authentication attempts within 10 minutes (`findtime = 600`).
- Ban Duration: 24 hours (`bantime = 86400`).

---

## 9. Emergency access and out-of-band recovery

In the event of accidental firewall misconfiguration or network lockout:

1. **VNC / Out-of-Band Serial Console**:
   - Access via the cloud provider's encrypted web console using multi-factor authentication (MFA).
   - Console access bypasses host network interfaces directly into the virtual tty.

2. **Emergency Key Storage**:
   - Encrypted backup SSH key stored in an offline password manager / hardware vault.

3. **Recovery Runbook**:
   - Emergency procedure documented in `docs/16-DEVELOPMENT-ROADMAP.md` / `docs/backlog/EPIC-16-INFRA-LAUNCH.md` runbooks (LOS-1612).

---

## 10. Automated verification

Compliance with this hardening baseline is audited using the automated script:
`life-os/scripts/verify-vps-hardening.sh`

The script performs non-destructive status checks for:
- Operating system release & UTC timezone
- Deploy user existence and sudo privileges
- SSH configuration directives (`PermitRootLogin`, `PasswordAuthentication`, etc.)
- UFW status and enabled rules
- Systemd time sync status
- Fail2ban service status and active sshd jail
- Unattended upgrades configuration
