import Link from 'next/link';

export function Footer() {
  return (
    <footer className="max-w-2xl mx-auto px-4 pt-8 pb-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-gray-400 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link href="/about" className="hover:text-accent-700">About</Link>
        <span aria-hidden>·</span>
        <Link href="/terms" className="hover:text-accent-700">Terms</Link>
        <span aria-hidden>·</span>
        <Link href="/privacy" className="hover:text-accent-700">Privacy</Link>
      </div>
    </footer>
  );
}
