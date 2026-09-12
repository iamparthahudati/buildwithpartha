import { Heading, Link, Logo, Text } from "@components/ui";
import { TERMS_VERSION } from "@features/auth";

import "./public-routes.css";

/**
 * Public Terms of Service Route (LOS-1614).
 *
 * Implements the official LifeOS Terms of Service at `/life-os/terms` matching
 * `TERMS_VERSION` (`2026-08-01`) recorded during user onboarding/signup consent.
 */
export function TermsRoute() {
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
              Terms of Service
            </Heading>
            <div className="lifeos-legal-meta">
              <span>
                <strong>Effective Date:</strong> August 1, 2026
              </span>
              <span>
                <strong>Version:</strong> {TERMS_VERSION}
              </span>
              <span>
                <strong>Operator:</strong> Partha (buildwithpartha.tech)
              </span>
            </div>
          </header>

          <div className="lifeos-legal-content">
            <section className="lifeos-legal-section">
              <Heading level={2} size="sm">
                1. Acceptance of Terms
              </Heading>
              <Text tone="secondary">
                By creating an account or using LifeOS, you agree to be bound by these Terms of
                Service (&ldquo;Terms&rdquo;) and our Privacy Notice. If you do not agree to these
                Terms, do not use the service.
              </Text>
            </section>

            <section className="lifeos-legal-section">
              <Heading level={2} size="sm">
                2. Eligibility & Accounts
              </Heading>
              <Text tone="secondary">
                LifeOS is available exclusively to adults (18 years of age or older). Each account
                is personal and single-user. You are responsible for safeguarding your login
                credentials and for all activity that occurs under your account. You agree to notify
                us immediately of any unauthorized account access.
              </Text>
            </section>

            <section className="lifeos-legal-section">
              <Heading level={2} size="sm">
                3. User Content & 100% Data Ownership
              </Heading>
              <Text tone="secondary">
                You retain complete, exclusive ownership and intellectual property rights in all
                data, tasks, notes, plans, and reflections you input into LifeOS (&ldquo;User
                Content&rdquo;). LifeOS claims zero ownership over your content. You grant LifeOS
                only the minimal license strictly required to host, store, back up, and render your
                content for your personal productivity.
              </Text>
            </section>

            <section className="lifeos-legal-section">
              <Heading level={2} size="sm">
                4. Acceptable Use
              </Heading>
              <Text tone="secondary">
                You agree not to misuse LifeOS. Prohibited actions include:
              </Text>
              <ul className="lifeos-legal-list">
                <li>
                  <Text tone="secondary">
                    Attempting to probe, scan, or compromise application or infrastructure security
                    controls.
                  </Text>
                </li>
                <li>
                  <Text tone="secondary">
                    Distributing malicious software or conducting denial-of-service activities.
                  </Text>
                </li>
                <li>
                  <Text tone="secondary">
                    Using automated scraping mechanisms to extract content or bypass rate limits.
                  </Text>
                </li>
              </ul>
            </section>

            <section className="lifeos-legal-section">
              <Heading level={2} size="sm">
                5. Service Availability & Changes
              </Heading>
              <Text tone="secondary">
                LifeOS is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.
                While we strive for maximum uptime, reliability, and automated data backup
                protection, we do not warrant uninterrupted or error-free operation. We reserve the
                right to improve, update, or discontinue features with reasonable notice.
              </Text>
            </section>

            <section className="lifeos-legal-section">
              <Heading level={2} size="sm">
                6. Account Deletion & Termination
              </Heading>
              <Text tone="secondary">
                You may terminate your account at any time via self-service in Settings. Following a
                30-day cancellation grace period, all user content is permanently erased in
                accordance with our Privacy Notice and retention schedule.
              </Text>
            </section>

            <section className="lifeos-legal-section">
              <Heading level={2} size="sm">
                7. Limitation of Liability & Governing Law
              </Heading>
              <Text tone="secondary">
                To the maximum extent permitted by applicable law, the operator shall not be liable
                for any indirect, incidental, special, consequential, or punitive damages arising
                out of your access to or inability to use LifeOS.
              </Text>
              <Text tone="secondary">
                These Terms are governed by and construed in accordance with the laws of India. Any
                legal disputes shall be subject to the exclusive jurisdiction of the competent
                courts in Bengaluru, Karnataka, India.
              </Text>
            </section>

            <section className="lifeos-legal-section">
              <Heading level={2} size="sm">
                8. Contact Information
              </Heading>
              <Text tone="secondary">
                If you have questions regarding these Terms, contact us at:
              </Text>
              <Text tone="secondary">
                <strong>Legal Inquiries:</strong>{" "}
                <Link href="mailto:legal@buildwithpartha.tech" external>
                  legal@buildwithpartha.tech
                </Link>
                <br />
                <strong>Operator:</strong> Partha
                <br />
                <strong>Website:</strong>{" "}
                <Link href="https://buildwithpartha.tech" external>
                  https://buildwithpartha.tech
                </Link>
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
