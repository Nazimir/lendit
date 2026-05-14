import Link from 'next/link';

export function PageHeader({ title, action, back }: { title: string; action?: React.ReactNode; back?: string }) {
  return (
    <header className="sticky top-0 z-20 bg-paper/95 backdrop-blur px-4 pt-[env(safe-area-inset-top)] border-b border-ink/10">
      <div className="max-w-2xl mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          {back && (
            <Link href={back} aria-label="Back" className="p-1 -ml-1 text-ink">
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          )}
          <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-ink">{title}</h1>
        </div>
        {action}
      </div>
    </header>
  );
}
