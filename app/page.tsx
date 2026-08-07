export default function Home() {
  return (
    <main>
      <header>
        <a className="brand" href="/" aria-label="Build with Partha home">
          Build with Partha
        </a>
        <div className="status">In the works</div>
      </header>

      <section className="hero" aria-labelledby="coming-soon-title">
        <p className="eyebrow">A new home for builders</p>
        <h1 id="coming-soon-title">
          Coming <span>soon.</span>
        </h1>
        <p className="intro">
          Practical ideas, thoughtful products, and useful things are taking
          shape. Check back soon&mdash;we&apos;re building something worth the
          wait.
        </p>
      </section>

      <footer>
        <span>&copy; 2026 Build with Partha</span>
        <span className="rule" aria-hidden="true" />
        <span>buildwithpartha.tech</span>
      </footer>
    </main>
  );
}
