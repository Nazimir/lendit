import Link from 'next/link';

export function LegalPage({
  title, lastUpdated, children
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-cream-100">
      <header className="px-4 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-xl tracking-tight text-accent-700">Partaz</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/about" className="text-gray-600 hover:text-accent-700">About</Link>
            <Link href="/terms" className="text-gray-600 hover:text-accent-700">Terms</Link>
            <Link href="/privacy" className="text-gray-600 hover:text-accent-700">Privacy</Link>
            <Link href="/login" className="btn-secondary text-sm py-2 px-4">Sign in</Link>
          </nav>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-8">
        <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-2">
          DRAFT — Pending legal review · Last updated {lastUpdated}
        </div>
        <h1 className="font-display text-4xl tracking-tight">{title}</h1>
        <div className="prose-style mt-6 text-[15px] leading-relaxed text-gray-800 space-y-4">
          {children}
        </div>
      </article>
    </main>
  );
}
