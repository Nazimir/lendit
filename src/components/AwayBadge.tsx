/**
 * Tiny "Away until X" pill shown on public profiles, item pages, and loan
 * pages whenever a counterparty is in away mode. Returns null if the user
 * is not currently away — safe to drop in anywhere.
 */
export function AwayBadge({ awayUntil }: { awayUntil: string | null | undefined }) {
  if (!awayUntil) return null;
  const until = new Date(awayUntil);
  if (until <= new Date()) return null;

  // For dates more than 6 months out, treat as "open-ended" (the toggle
  // sets a 1-year placeholder when the user leaves the date blank).
  const sixMonths = new Date(Date.now() + 180 * 86_400_000);
  const label = until > sixMonths
    ? 'Away'
    : `Away until ${until.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  return (
    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-butter-soft text-accent-900 inline-flex items-center gap-1">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {label}
    </span>
  );
}
