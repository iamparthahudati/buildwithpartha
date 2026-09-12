import { Heading, Link, Logo, Text } from "@components/ui";
import { PRIVACY_VERSION } from "@features/auth";

import "./public-routes.css";

/**
 * Public Privacy Notice Route (LOS-1614).
 *
 * Implements the official LifeOS Privacy Notice at `/life-os/privacy` conforming to
 * `docs/31-PRIVACY-DATA-LIFECYCLE.md`, `ADR-012-V1-PRIVACY-POSTURE.md`, and the India
 * Digital Personal Data Protection Act (DPDP Act 2023) baseline.
 */
export function PrivacyRoute() {
  return (
    <div className="lifeos-public-page">
      <header className="lifeos-public-header">
        <div className="lifeos-public-header-inner">
          <Link href="/life-os" className="lifeos-public-brand" aria-label="LifeOS home">
            <Logo size="md" />
            <Heading level={2} size="md">
              LifeOS
            </Heading>
          </Link>

          <nav className="lifeos-public-nav-actions" aria-label="Legal navigation">
            <Link href="/life-os">← Back to LifeOS</Link>
          </nav>
        </div>
      </header>

      <main className="lifeos-public-main" id="main-content">
        <div className="lifeos-legal-container">
          <header className="lifeos-legal-header">
            <Heading level={1} size="lg">
              Privacy Notice
            </Heading>
            <div className="lifeos-legal-meta">
              <span>
                <strong>Effective Date:</strong> August 1, 2026
              </span>
              <span>
                <strong>Version:</strong> {PRIVACY_VERSION}
              </span>
              <span>
                <strong>Data Fiduciary:</strong> Partha (buildwithpartha.tech)
              </span>
            </div>
          </header>

          <div className="lifeos-legal-content">
            <section className="lifeos-legal-section">
              <Heading level={2} size="sm">
                1. Introduction & Scope
              </Heading>
              <Text tone="secondary">
                LifeOS is a personal, private productivity platform developed and operated by Partha
                at <code>buildwithpartha.tech</code>. This Privacy Notice describes our
                deterministic data collection, processing, retention, and deletion practices when
                you access or use LifeOS.
              </Text>
              <Text tone="secondary">
                LifeOS is intended exclusively for adults (18 years of age or older). We do not
                knowingly collect personal data from children. Our product posture is India-first,
                complying with the Digital Personal Data Protection Act, 2023 (DPDP Act 2023) and
                applicable rules.
              </Text>
            </section>

            <section className="lifeos-legal-section">
              <Heading level={2} size="sm">
                2. Information We Collect
              </Heading>
              <Text tone="secondary">
                We strictly limit collection to the minimum information necessary to provide the
                service:
              </Text>
              <ul className="lifeos-legal-list">
                <li>
                  <Text tone="secondary">
                    <strong>Account Data (Class P1):</strong> Email address, display name, preferred
                    locale, timezone, and records of your versioned terms acceptance and privacy
                    acknowledgments.
                  </Text>
                </li>
                <li>
                  <Text tone="secondary">
                    <strong>User Content (Class P2):</strong> Projects, tasks, notes, habits, time
                    blocks, brain dump items, goals, and reflections created within the application.
                  </Text>
                </li>
                <li>
                  <Text tone="secondary">
                    <strong>Security & Operational Metadata (Class P3):</strong> Password hashes
                    (Argon2id), cryptographically hashed session identifiers, CSRF tokens, and
                    sanitized security audit events. We do not store plaintext passwords or tokens.
                  </Text>
                </li>
              </ul>
            </section>

            <section className="lifeos-legal-section">
              <Heading level={2} size="sm">
                3. What We Never Do
              </Heading>
              <Text tone="secondary">
                Our architecture enforces strict data minimization and boundary protection:
              </Text>
              <ul className="lifeos-legal-list">
                <li>
                  <Text tone="secondary">
                    <strong>No Advertising or Tracking:</strong> We use zero third-party tracking
                    pixels, behavioral analytics, or session-replay scripts.
                  </Text>
                </li>
                <li>
                  <Text tone="secondary">
                    <strong>No Data Selling or Brokerage:</strong> We never sell, rent, or trade
                    your personal data or content to third parties.
                  </Text>
                </li>
                <li>
                  <Text tone="secondary">
                    <strong>No AI Training on Your Content:</strong> Your tasks, notes, and private
                    plans are never used to train machine learning models.
                  </Text>
                </li>
              </ul>
            </section>

            <section className="lifeos-legal-section">
              <Heading level={2} size="sm">
                4. Data Retention, Export, and Deletion
              </Heading>
              <Text tone="secondary">
                You maintain complete control over the lifecycle of your information:
              </Text>
              <ul className="lifeos-legal-list">
                <li>
                  <Text tone="secondary">
                    <strong>Data Portability & Export:</strong> You can download a complete,
                    structured JSON export of your account data and user content at any time from
                    Settings. Export archives remain available for 24 hours.
                  </Text>
                </li>
                <li>
                  <Text tone="secondary">
                    <strong>Account Deletion & Grace Period:</strong> When you request account
                    deletion, all active sessions are immediately revoked and data is scheduled for
                    permanent purge following a 30-day cancellation grace period.
                  </Text>
                </li>
                <li>
                  <Text tone="secondary">
                    <strong>Backup Lifecycle:</strong> Encrypted operational backups are retained
                    for a maximum of 35 days and then permanently destroyed. Restorations re-apply
                    deletion ledgers.
                  </Text>
                </li>
              </ul>
            </section>

            <section className="lifeos-legal-section">
              <Heading level={2} size="sm">
                5. Security Safeguards
              </Heading>
              <Text tone="secondary">
                We implement industry-standard technical and organizational security controls:
              </Text>
              <ul className="lifeos-legal-list">
                <li>
                  <Text tone="secondary">
                    Strict Transport Security (HTTPS with TLS 1.3/HSTS) across all endpoints.
                  </Text>
                </li>
                <li>
                  <Text tone="secondary">
                    Robust Content Security Policy (CSP) blocking unauthorized script injection and
                    framing.
                  </Text>
                </li>
                <li>
                  <Text tone="secondary">
                    Isolated backend database networking with encrypted storage and zero public
                    database exposure.
                  </Text>
                </li>
              </ul>
            </section>

            <section className="lifeos-legal-section">
              <Heading level={2} size="sm">
                6. Your Rights & Grievance Redressal
              </Heading>
              <Text tone="secondary">
                Under the DPDP Act 2023 and applicable privacy standards, you have the right to
                access, correct, update, and erase your personal data, as well as the right to
                grievance redressal.
              </Text>
              <Text tone="secondary">
                For any privacy inquiries, data subject requests, or grievances, contact our
                designated Data Protection & Grievance Officer:
              </Text>
              <Text tone="secondary">
                <strong>Grievance Officer:</strong> Partha
                <br />
                <strong>Email:</strong>{" "}
                <Link href="mailto:privacy@buildwithpartha.tech" external>
                  privacy@buildwithpartha.tech
                </Link>
                <br />
                <strong>Website:</strong>{" "}
                <Link href="https://buildwithpartha.tech" external>
                  https://buildwithpartha.tech
                </Link>
                <br />
                <strong>Response Window:</strong> We respond to all verified grievance and rights
                inquiries within 7 business days.
              </Text>
            </section>
          </div>
        </div>
      </main>

      <footer className="lifeos-public-footer">
        <div className="lifeos-public-footer-inner">
          <div>
            <span>© {new Date().getFullYear()} Build with Partha. All rights reserved.</span>
          </div>
          <div className="lifeos-public-footer-links">
            <Link href="/life-os/terms">Terms of Service</Link>
            <Link href="/life-os/privacy">Privacy Policy</Link>
            <Link href="https://buildwithpartha.tech/.well-known/security.txt" external>
              Security
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
