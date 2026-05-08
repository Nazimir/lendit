'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

export function AwayModeToggle({ profile }: { profile: Profile }) {
  const router = useRouter();
  const initiallyAway = profile.away_until ? new Date(profile.away_until) > new Date() : false;
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string>(
    profile.away_until ? profile.away_until.slice(0, 10) : ''
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true); setError(null);
    const sb = createClient();
    // Empty date = open-ended away (user will turn it off manually).
    // Date with no time = end of that day in local time.
    const value = date ? new Date(date + 'T23:59:59').toISOString() : null;
    // If date is empty AND user hit "Set away", treat as open-ended (set to far future).
    const finalValue = value === null
      ? new Date(Date.now() + 365 * 86_400_000).toISOString()
      : value;
    const { error } = await sb.from('profiles').update({ away_until: finalValue }).eq('id', profile.id);
    setBusy(false);
    if (error) { setError(error.message); return; }
    setOpen(false);
    router.refresh();
  }

  async function turnOff() {
    if (!confirm("Turn off away mode? Auto-actions on your loans will resume.")) return;
    setBusy(true); setError(null);
    const sb = createClient();
    const { error } = await sb.from('profiles').update({ away_until: null }).eq('id', profile.id);
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  if (initiallyAway) {
    const until = new Date(profile.away_until!);
    const label = until.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return (
      <div className="card p-4 border-2 border-butter-soft bg-butter-soft/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-butter-soft flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5F4E33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg leading-tight">You&apos;re set to away</h3>
            <p className="text-sm text-gray-700 mt-1">
              Until <strong>{label}</strong>. Auto-actions on your loans (like auto-cancelling
              stuck handovers) are paused. Borrowers see an &quot;Away&quot; badge on your profile and items.
            </p>
          </div>
        </div>
        <button onClick={turnOff} disabled={busy} className="btn-secondary mt-3 w-full text-sm py-2">
          {busy ? 'Updating…' : "I'm back — turn off away mode"}
        </button>
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      </div>
    );
  }

  if (!open) {
    return (
      <button className="btn-secondary w-full" onClick={() => setOpen(true)}>
        Set away mode
      </button>
    );
  }

  return (
    <div className="card p-4 space-y-3">
      <div>
        <h3 className="font-display text-lg">Away mode</h3>
        <p className="text-xs text-gray-600 mt-1">
          Travelling, busy, or otherwise unavailable? Pause auto-actions on your loans
          while you&apos;re away. Borrowers can still browse and request, but they&apos;ll see
          you&apos;re away.
        </p>
      </div>
      <div>
        <label className="label">Back by (optional)</label>
        <input
          className="input"
          type="date"
          value={date}
          min={new Date().toISOString().slice(0, 10)}
          onChange={e => setDate(e.target.value)}
        />
        <p className="text-[11px] text-gray-500 mt-1">
          Leave blank for open-ended away. You can turn it off any time.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          disabled={busy}
          className="btn-secondary flex-1"
        >
          Cancel
        </button>
        <button onClick={save} disabled={busy} className="btn-primary flex-1">
          {busy ? 'Setting…' : 'Set away mode'}
        </button>
      </div>
    </div>
  );
}
