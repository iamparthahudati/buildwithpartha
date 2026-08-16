export function App() {
  return (
    <main className="foundation" aria-labelledby="foundation-title">
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
  );
}
