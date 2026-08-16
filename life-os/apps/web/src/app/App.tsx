/**
 * Target for the skip link. `tabIndex={-1}` makes the landmark programmatically
 * focusable so activating the link moves real focus, not just the scroll
 * position; it stays out of the tab order.
 */
const MAIN_CONTENT_ID = "lifeos-main-content";

export function App() {
  return (
    <>
      <a className="lifeos-skip-link" href={`#${MAIN_CONTENT_ID}`}>
        Skip to main content
      </a>
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="foundation"
        aria-labelledby="foundation-title"
      >
        <section className="foundation__card">
          <div className="foundation__mark" aria-hidden="true">
            L
          </div>
          <p className="foundation__eyebrow">LifeOS</p>
          <h1 id="foundation-title">Foundation ready</h1>
          <p className="foundation__summary">
            The LifeOS web application is ready for its component-first build.
          </p>
          <dl className="foundation__details">
            <div>
              <dt>Web address</dt>
              <dd>/life-os/</dd>
            </div>
            <div>
              <dt>Current stage</dt>
              <dd>Building the foundation</dd>
            </div>
          </dl>
          <p className="foundation__note">
            Account access and product screens will appear as their components are completed.
          </p>
        </section>
      </main>
    </>
  );
}
