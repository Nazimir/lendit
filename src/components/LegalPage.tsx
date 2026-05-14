import Link from 'next/link';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';

export function LegalPage({
  title, lastUpdated, children
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-paper">
      <header className="px-6 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto py-6 flex items-center justify-between">
          <Wordmark size={22} />
          <nav className="flex items-center gap-4">
            <Link href="/about" className="text-ink-soft hover:text-ink">
              <Mono>About</Mono>
            </Link>
            <Link href="/terms" className="text-ink-soft hover:text-ink">
              <Mono>Terms</Mono>
            </Link>
            <Link href="/privacy" className="text-ink-soft hover:text-ink">
              <Mono>Privacy</Mono>
            </Link>
            <Link href="/login" className="font-mono text-[10px] uppercase tracking-mono px-3 py-1.5 rounded-full border border-ink/20 text-ink hover:border-ink/40 transition">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 pb-16">
        <div className="mt-6 mb-4">
          <Mono className="text-ink-soft block">
            Draft · Pending legal review · Last updated {lastUpdated}
          </Mono>
        </div>
        <h1 className="font-display font-extrabold text-[56px] leading-[0.88] tracking-[-0.045em] text-ink text-balance">
          {renderTitle(title)}
        </h1>

        <div className="mt-10 border-y-[1.5px] border-ink py-8 prose-legal text-[15.5px] leading-[1.7] text-ink space-y-4">
          {children}
        </div>
      </article>
    </main>
  );
}

/**
 * Bring the soft beat into the H1: any text inside curly braces becomes
 * italic — e.g. "Terms of {Service}" → renders "Service" in Instrument
 * Serif italic. Falls back to plain text when no braces are found.
 */
function renderTitle(title: string): React.ReactNode {
  const match = /\{([^}]+)\}/.exec(title);
  if (!match) return title;
  const before = title.slice(0, match.index);
  const after = title.slice(match.index + match[0].length);
  return (
    <>
      {before}
      <Italic>{match[1]}</Italic>
      {after}
    </>
  );
}
