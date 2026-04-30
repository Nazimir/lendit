import Link from 'next/link';

export function PageHeader({ title, action, back }: { title: string; action?: React.ReactNode; back?: string }) {
  return (
    <header className="sticky top-0 z-20 bg-cream-100/95 backdrop-blur px-4 pt-[env(safe-area-inset-top)]">
      <div className="max-w-2xl mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          {back && (
            <Link href={back} aria-label="Back" className="p-1 -ml-1 text-accent-700">
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          )}
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        </div>
        {action}
      </div>
    </header>
  );
}
