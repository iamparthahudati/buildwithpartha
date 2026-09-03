import Link from "next/link";

const YEAR = new Date().getFullYear();

/* ------------------------------------------------------------------ */
/*  Data — edit these arrays as tools & tutorials ship                */
/* ------------------------------------------------------------------ */

const projects = [
  {
    name: "LifeOS",
    status: "Building",
    statusTone: "live" as const,
    tagline: "A calm operating system for your day.",
    description:
      "Plan, focus, and review your work in one place — tasks, time blocks, sprints, habits and reviews, designed to reduce noise instead of adding it.",
    tags: ["React", "Spring Boot", "Postgres"],
    href: "/life-os",
  },
  {
    name: "Toolbox",
    status: "Coming soon",
    statusTone: "soon" as const,
    tagline: "Small, sharp utilities.",
    description:
      "A growing shelf of focused web tools — the kind you bookmark and reach for every week. Fast, free, and no sign-up.",
    tags: ["Web", "Free"],
    href: undefined,
  },
  {
    name: "Field notes",
    status: "Coming soon",
    statusTone: "soon" as const,
    tagline: "Tutorials & build logs.",
    description:
      "Practical write-ups on shipping real software — architecture calls, the messy middle, and what actually worked.",
    tags: ["Writing", "Guides"],
    href: undefined,
  },
];

const principles = [
  {
    k: "01",
    title: "Ship real things",
    body: "Working software over slideware. Every project here is something you can actually use.",
  },
  {
    k: "02",
    title: "Keep it calm",
    body: "Tools should lower your heart rate. Clean interfaces, sane defaults, no dark patterns.",
  },
  {
    k: "03",
    title: "Build in the open",
    body: "Notes, decisions and trade-offs shared along the way — so the learning compounds.",
  },
];

const stack = [
  "TypeScript",
  "React",
  "Next.js",
  "Java · Spring",
  "Postgres",
  "Cloudflare",
  "Tailwind",
  "Docker",
];

/* ------------------------------------------------------------------ */

function StatusPill({ tone, label }: { tone: "live" | "soon"; label: string }) {
  const live = tone === "live";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
      <span
        className={
          "h-2 w-2 rounded-full " +
          (live ? "bg-emerald-400 live-dot" : "bg-[var(--faint)]")
        }
      />
      {label}
    </span>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[560px] grid-bg" />
        <div className="absolute inset-x-0 top-0 h-[560px] glow" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)]/60 bg-[var(--bg)]/70 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <img src="/favicon.svg" alt="" width={22} height={22} />
            <span>
              Build with <span className="gradient-text">Partha</span>
            </span>
          </Link>
          <div className="hidden items-center gap-7 text-sm text-[var(--muted)] sm:flex">
            <a href="#building" className="transition-colors hover:text-[var(--text)]">Building</a>
            <a href="#approach" className="transition-colors hover:text-[var(--text)]">Approach</a>
            <a href="#about" className="transition-colors hover:text-[var(--text)]">About</a>
          </div>
          <a
            href="#contact"
            className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-2)]"
          >
            Say hi
          </a>
        </nav>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-5xl px-6">
        <section className="pt-20 pb-24 sm:pt-28 sm:pb-28">
          <div className="rise inline-flex items-center gap-2 rounded-full chip px-3 py-1 text-xs text-[var(--muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            Independent builder · shipping in public
          </div>

          <h1 className="rise mt-6 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Practical ideas,
            <br />
            turned into <span className="gradient-text">useful things.</span>
          </h1>

          <p className="rise mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
            I&apos;m Partha. I design and build thoughtful products and small
            tools — and write about how they come together. This is home base
            for everything I make.
          </p>

          <div className="rise mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#building"
              className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[#04121f] transition-transform hover:-translate-y-0.5"
            >
              See what I&apos;m building
            </a>
            <a
              href="#contact"
              className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)]"
            >
              Work with me
            </a>
          </div>
        </section>

        {/* Building */}
        <section id="building" className="scroll-mt-20 border-t border-[var(--border)] pt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--accent-2)]">The workshop</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                What I&apos;m building
              </h2>
            </div>
            <p className="hidden max-w-xs text-right text-sm text-[var(--muted)] sm:block">
              More tools and tutorials land here as they ship.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const inner = (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold tracking-tight">{p.name}</h3>
                    <StatusPill tone={p.statusTone} label={p.status} />
                  </div>
                  <p className="mt-1 text-sm font-medium text-[var(--accent-2)]">{p.tagline}</p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                    {p.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--faint)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  {p.href && (
                    <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-2)]">
                      Open <span aria-hidden>→</span>
                    </div>
                  )}
                </>
              );

              return p.href ? (
                <Link key={p.name} href={p.href} className="card flex flex-col p-6">
                  {inner}
                </Link>
              ) : (
                <div key={p.name} className="card flex flex-col p-6 opacity-95">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>

        {/* Approach */}
        <section id="approach" className="scroll-mt-20 pt-20">
          <p className="text-sm font-medium text-[var(--accent-2)]">How I work</p>
          <h2 className="mt-1 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
            A few things I believe about building software.
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {principles.map((pr) => (
              <div key={pr.k} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] p-6">
                <div className="font-mono text-sm text-[var(--accent)]">{pr.k}</div>
                <h3 className="mt-3 text-base font-semibold">{pr.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{pr.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section id="about" className="scroll-mt-20 pt-20">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-soft)] p-8 sm:p-12">
            <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="text-sm font-medium text-[var(--accent-2)]">About</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Hi, I&apos;m Partha 👋
                </h2>
                <div className="mt-4 space-y-4 text-[var(--muted)]">
                  <p>
                    I&apos;m a software engineer who likes taking an idea all the
                    way to something real — from the first sketch to the thing
                    running in production.
                  </p>
                  <p>
                    Lately I&apos;m building{" "}
                    <span className="font-medium text-[var(--text)]">LifeOS</span>, a
                    calm productivity system, and a shelf of small tools I wished
                    existed. Along the way I write up what I learn so it&apos;s
                    useful to someone else too.
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-[var(--faint)]">Tools of the trade</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {stack.map((s) => (
                    <span key={s} className="rounded-full chip px-3 py-1 text-sm text-[var(--muted)]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section id="contact" className="scroll-mt-20 py-24">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-[var(--bg-soft)] px-8 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 glow" />
            <h2 className="relative text-2xl font-bold tracking-tight sm:text-4xl">
              Got an idea worth building?
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-[var(--muted)]">
              Whether it&apos;s a product, a tool, or just a question — I&apos;d
              genuinely love to hear it.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="mailto:hello@buildwithpartha.tech"
                className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[#04121f] transition-transform hover:-translate-y-0.5"
              >
                hello@buildwithpartha.tech
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-[var(--faint)] sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" width={18} height={18} />
            <span>&copy; {YEAR} Build with Partha</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com" className="transition-colors hover:text-[var(--text)]">GitHub</a>
            <a href="https://x.com" className="transition-colors hover:text-[var(--text)]">X</a>
            <a href="mailto:hello@buildwithpartha.tech" className="transition-colors hover:text-[var(--text)]">Email</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
