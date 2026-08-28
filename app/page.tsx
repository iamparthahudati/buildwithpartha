export default function Home() {
  return (
    <main className="min-h-screen p-8 flex flex-col justify-between">
      <header className="flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">Build with Partha</h1>
      </header>

      <section className="my-auto py-12 max-w-2xl">
        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
          Build with Partha
        </h2>
        <p className="text-lg text-neutral-400">
          Welcome to Build with Partha. Ready to build something great.
        </p>
      </section>

      <footer className="text-sm text-neutral-500">
        &copy; {new Date().getFullYear()} Build with Partha
      </footer>
    </main>
  );
}
