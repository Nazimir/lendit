'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mono, Italic } from '@/components/typography';
import type { Profile } from '@/lib/types';

// Anything more than this many days out is treated as "open-ended" away
// (the user didn't pick a return date; we store ~365 days as a sentinel
// so the auto-pause logic keeps working, but display it as indefinite).
const OPEN_ENDED_THRESHOLD_DAYS = 90;

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
    // Date with no time = end of that day in local time.
    // Empty date = open-ended away. We store ~365 days out as a sentinel
    // so the trigger that checks `away_until > now()` keeps firing.
    const finalValue = date
      ? new Date(date + 'T23:59:59').toISOString()
      : new Date(Date.now() + 365 * 86_400_000).toISOString();
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
    const daysOut = (until.getTime() - Date.now()) / 86_400_000;
    const isOpenEnded = daysOut > OPEN_ENDED_THRESHOLD_DAYS;
    const label = isOpenEnded
      ? null
      : until.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    return (
      <div className="bg-cat-kitchen border-[1.5px] border-ink rounded-md p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-paper border-[1.5px] border-ink flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16130D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <Mono className="text-ink/70 block mb-1">Away mode</Mono>
            <h3 className="font-display font-bold text-[20px] leading-tight tracking-[-0.015em] text-ink">
              {isOpenEnded ? <>Away <Italic>indefinitely</Italic>.</> : <>Back by <Italic>{label}</Italic>.</>}
            </h3>
            <p className="text-sm text-ink/80 mt-2 leading-snug">
              {isOpenEnded
                ? "Auto-actions on your loans are paused until you turn this off. Borrowers see an \"Away\" badge on your profile and items."
                : "Auto-actions on your loans (like auto-cancelling stuck handovers) are paused. Borrowers see an \"Away\" badge on your profile and items."}
            </p>
          </div>
        </div>
        <button onClick={turnOff} disabled={busy} className="btn-primary mt-5 w-full flex justify-between items-center">
          <span>{busy ? 'Updating…' : <>I&apos;m <Italic>back</Italic></>}</span>
          <span aria-hidden>→</span>
        </button>
        {error && <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>}
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
    <div className="bg-cat-kitchen border-[1.5px] border-ink rounded-md p-5">
      <Mono className="text-ink/70 block mb-1">Away mode</Mono>
      <h3 className="font-display font-bold text-[20px] leading-tight tracking-[-0.015em] text-ink">
        Going <Italic>somewhere</Italic>?
      </h3>
      <p className="text-sm text-ink/80 mt-2 leading-snug">
        Travelling, busy, or otherwise unavailable? Pause auto-actions on your loans while you&apos;re away. Borrowers can still browse and request, but they&apos;ll see you&apos;re away.
      </p>

      <div className="mt-5">
        <label className="label">Back by (optional)</label>
        <input
          className="input"
          type="date"
          value={date}
          min={new Date().toISOString().slice(0, 10)}
          onChange={e => setDate(e.target.value)}
        />
        <Mono className="text-ink/70 mt-2 block">
          Leave blank for open-ended. You can turn it off any time.
        </Mono>
      </div>

      {error && <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>}

      <div className="flex gap-2 mt-5">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          disabled={busy}
          className="btn-secondary flex-1"
        >
          Cancel
        </button>
        <button onClick={save} disabled={busy} className="btn-primary flex-1 flex justify-between items-center">
          <span>{busy ? 'Setting…' : <>Set <Italic>away</Italic></>}</span>
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
