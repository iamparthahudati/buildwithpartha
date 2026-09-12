import { ArrowRight, CheckSquare, Clock, Repeat, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button, Heading, Link, Logo, Text } from "@components/ui";
import { useAuthSession } from "@state/authSession";

import "./public-routes.css";

/**
 * Public Landing / Entry Route (LOS-1614).
 *
 * Minimal, honest entry point mounted at `/life-os` per `23-NAVIGATION-AND-ROUTES.md`
 * and `30-CONTENT-AND-TONE-GUIDE.md`. Signed-in users can continue straight to Today,
 * while new and returning visitors can navigate cleanly to signup, login, or legal notices.
 */
export function LandingRoute() {
  const { user } = useAuthSession();
  const navigate = useNavigate();

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

          <nav className="lifeos-public-nav-actions" aria-label="Public navigation">
            {user ? (
              <Button variant="primary" size="sm" onClick={() => navigate("/life-os/app/today")}>
                Go to Today
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/life-os/login")}>
                  Sign in
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate("/life-os/signup")}>
                  Create account
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="lifeos-public-main" id="main-content">
        <section className="lifeos-landing-hero">
          <Heading level={1} size="xl">
            A private place to plan work, focus, and reflect
          </Heading>
          <Text tone="secondary" size="lg">
            Calm, intentional productivity structured around your day. No ads, no third-party
            tracking, and zero distractions.
          </Text>

          <div className="lifeos-landing-hero-actions">
            {user ? (
              <Button variant="primary" size="lg" onClick={() => navigate("/life-os/app/today")}>
                Open LifeOS <ArrowRight size={18} aria-hidden="true" />
              </Button>
            ) : (
              <>
                <Button variant="primary" size="lg" onClick={() => navigate("/life-os/signup")}>
                  Get started <ArrowRight size={18} aria-hidden="true" />
                </Button>
                <Button variant="secondary" size="lg" onClick={() => navigate("/life-os/login")}>
                  Sign in
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="lifeos-landing-grid" aria-label="LifeOS Core Capabilities">
          <article className="lifeos-landing-card">
            <div className="lifeos-landing-card-icon" aria-hidden="true">
              <CheckSquare size={24} />
            </div>
            <Heading level={3} size="sm">
              Plan with clarity
            </Heading>
            <Text tone="secondary">
              Organize projects, sprints, and daily tasks with deliberate priority. Keep what
              matters visible on your Today dashboard.
            </Text>
          </article>

          <article className="lifeos-landing-card">
            <div className="lifeos-landing-card-icon" aria-hidden="true">
              <Clock size={24} />
            </div>
            <Heading level={3} size="sm">
              Deep focus & time blocks
            </Heading>
            <Text tone="secondary">
              Reserve dedicated time blocks and enter distraction-free Focus Mode with active timers
              and quick brain dump capture.
            </Text>
          </article>

          <article className="lifeos-landing-card">
            <div className="lifeos-landing-card-icon" aria-hidden="true">
              <Repeat size={24} />
            </div>
            <Heading level={3} size="sm">
              Habits & reflection
            </Heading>
            <Text tone="secondary">
              Build lasting daily routines, capture structured notes, and complete thoughtful
              morning and weekly reviews.
            </Text>
          </article>

          <article className="lifeos-landing-card">
            <div className="lifeos-landing-card-icon" aria-hidden="true">
              <Shield size={24} />
            </div>
            <Heading level={3} size="sm">
              Private by design
            </Heading>
            <Text tone="secondary">
              Your data belongs solely to you. We do not sell data, track behavioral cookies, or use
              your content to train AI models.
            </Text>
          </article>
        </section>
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
