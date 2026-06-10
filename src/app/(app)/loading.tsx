/**
 * Shared loading skeleton for all (app) routes. The bottom nav stays mounted
 * (it lives in the layout), so tapping a tab gives instant feedback while the
 * server renders the page — important on slow mobile connections.
 */
export default function Loading() {
  return (
    <main className="max-w-2xl mx-auto pb-8 animate-pulse" aria-busy="true" aria-label="Loading">
      {/* Editorial header placeholder */}
      <header className="px-5 pt-12 pb-5 border-b-[1.5px] border-ink/15">
        <div className="flex justify-between items-center">
          <div className="h-3 w-24 bg-ink/10 rounded" />
          <div className="h-3 w-20 bg-ink/10 rounded" />
        </div>
        <div className="mt-4 h-12 w-3/4 bg-ink/10 rounded-xl" />
        <div className="mt-3 h-4 w-1/2 bg-ink/10 rounded" />
      </header>

      {/* List rows placeholder */}
      <section className="px-5 pt-6 space-y-5">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-ink/10 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-3 w-16 bg-ink/10 rounded" />
              <div className="mt-2.5 h-4 w-2/3 bg-ink/10 rounded" />
              <div className="mt-2 h-3 w-1/3 bg-ink/10 rounded" />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
