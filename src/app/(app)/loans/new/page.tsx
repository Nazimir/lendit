'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mono, Italic } from '@/components/typography';

type ItemMatch = { id: string; title: string };
type Direction = 'lend' | 'borrow';

/**
 * Manual loan logging — the cornerstone "I lent / I borrowed" form.
 * The same page handles both directions via a top toggle:
 *   - lend mode: pick from your shelf or type new; borrower is free text
 *   - borrow mode: item is free text (not your stuff); lender is free text
 *
 * Submits via create_manual_loan or create_manual_borrow depending on
 * direction. Both create a private stub item on the current user's
 * shelf — the items table is each user's personal catalog of stuff
 * they're tracking, not a shared marketplace.
 */
export default function NewLoanPage() {
  return (
    <Suspense fallback={null}>
      <NewLoanInner />
    </Suspense>
  );
}

function NewLoanInner() {
  const router = useRouter();
  const search = useSearchParams();
  const initialDirection: Direction = search.get('direction') === 'borrow' ? 'borrow' : 'lend';

  const [direction, setDirection] = useState<Direction>(initialDirection);

  // Item picker (lend mode uses shelf autocomplete; borrow mode is free text only)
  const [itemQuery, setItemQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [showMatches, setShowMatches] = useState(false);

  // Counterparty fields (borrower if lending, lender if borrowing)
  const [counterpartyName, setCounterpartyName] = useState('');
  const [counterpartyContact, setCounterpartyContact] = useState('');

  // Dates
  const today = new Date().toISOString().slice(0, 10);
  const [lentOn, setLentOn] = useState(today);
  const [alreadyReturned, setAlreadyReturned] = useState(false);
  const [returnedOn, setReturnedOn] = useState(today);
  const [dueOn, setDueOn] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  // UI state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the shelf picker when switching to borrow mode — borrowed items
  // aren't on the user's shelf, so any prior selection becomes stale.
  function switchDirection(d: Direction) {
    setDirection(d);
    setSelectedItemId(null);
    setMatches([]);
    setError(null);
  }

  // Fetch matching items as the user types — only in lend mode.
  useEffect(() => {
    if (direction !== 'lend' || itemQuery.trim().length === 0) {
      setMatches([]);
      return;
    }
    const handle = setTimeout(async () => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data } = await sb
        .from('items')
        .select('id, title')
        .eq('owner_id', user.id)
        .ilike('title', `%${itemQuery.trim()}%`)
        .limit(5);
      setMatches((data ?? []) as ItemMatch[]);
    }, 150);
    return () => clearTimeout(handle);
  }, [itemQuery, direction]);

  function pickItem(item: ItemMatch) {
    setItemQuery(item.title);
    setSelectedItemId(item.id);
    setShowMatches(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!counterpartyName.trim()) {
      setError(direction === 'lend' ? 'Borrower name is required.' : 'Lender name is required.');
      return;
    }
    if (!itemQuery.trim())              { setError('Item name is required.'); return; }

    setBusy(true); setError(null);

    try {
      const sb = createClient();
      // All three dates are honestly optional — empty means "I don't remember
      // / don't want to commit to a specific date." Store as NULL in that case
      // rather than fabricating today.
      const handoverAt = lentOn     ? new Date(lentOn     + 'T12:00:00').toISOString() : null;
      const dueAt      = dueOn      ? new Date(dueOn      + 'T12:00:00').toISOString() : null;
      const returnedAt = alreadyReturned && returnedOn
        ? new Date(returnedOn + 'T12:00:00').toISOString()
        : null;

      const { data, error } = direction === 'lend'
        ? await sb.rpc('create_manual_loan', {
            p_item_id:           selectedItemId,
            p_item_title:        selectedItemId ? null : itemQuery.trim(),
            p_borrower_name:     counterpartyName.trim(),
            p_borrower_contact:  counterpartyContact.trim() || null,
            p_handover_at:       handoverAt,
            p_due_at:            dueAt,
            p_already_returned:  alreadyReturned,
            p_returned_at:       returnedAt,
            p_notes:             notes.trim() || null
          })
        : await sb.rpc('create_manual_borrow', {
            p_item_title:        itemQuery.trim(),
            p_lender_name:       counterpartyName.trim(),
            p_lender_contact:    counterpartyContact.trim() || null,
            p_handover_at:       handoverAt,
            p_due_at:            dueAt,
            p_already_returned:  alreadyReturned,
            p_returned_at:       returnedAt,
            p_notes:             notes.trim() || null
          });

      if (error) { setError(error.message); setBusy(false); return; }

      router.replace(`/loans/${data}`);
      router.refresh();
    } catch (err) {
      // Defensive: anything that throws (invalid date string, network blip,
      // etc.) lands here so the UI doesn't get stuck on "Saving…".
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setBusy(false);
    }
  }

  // Labels and copy that adapt to direction.
  const headline       = direction === 'lend' ? <>Log a <Italic>loan</Italic>.</> : <>Log a <Italic>borrow</Italic>.</>;
  const subhead        = direction === 'lend'
    ? <>Add something you&apos;ve already lent — even if the borrower isn&apos;t on Partaz.</>
    : <>Add something you&apos;re holding for someone — even if they aren&apos;t on Partaz.</>;
  const itemLabel      = direction === 'lend' ? 'Item' : 'What you have';
  const itemHint       = direction === 'lend'
    ? (selectedItemId
        ? 'Picked from your shelf.'
        : 'New name? We’ll add a quiet placeholder to your shelf — fill in the photo later.')
    : 'We’ll add a quiet placeholder to your inventory so you can track it.';
  const itemPlaceholder = direction === 'lend'
    ? 'e.g. Bosch drill, ladder, blue Tupperware'
    : 'e.g. Sony A7, 70-200 lens, ladder';
  const counterpartyLabel = direction === 'lend' ? 'Lent to' : 'Lent by';
  const counterpartyPlaceholder = direction === 'lend'
    ? 'First name, nickname, however you remember them'
    : 'Friend, shop, business — whoever owns it';
  const lentOnLabel    = direction === 'lend' ? 'Lent on' : 'Borrowed on';
  const claimNotice    = direction === 'lend'
    ? 'Useful later if you want to send them a claim link to track it on their side.'
    : 'Useful later if you want to let them know you have their stuff.';

  return (
    <main className="max-w-2xl mx-auto pb-16">
      {/* Masthead */}
      <header className="px-5 pt-12 pb-5 bg-paper border-b-[1.5px] border-ink">
        <div className="flex justify-between items-center">
          <Link href="/loans" className="text-ink-soft hover:text-ink">
            <Mono>← Sharing</Mono>
          </Link>
          <Mono className="text-ink-soft">New entry</Mono>
        </div>
        <h1 className="mt-3 font-display font-extrabold text-[44px] leading-[0.88] tracking-[-0.045em] text-ink">
          {headline}
        </h1>
        <p className="font-display font-medium text-[15px] leading-[1.35] text-ink-soft mt-2.5">
          {subhead}
        </p>
      </header>

      {/* Direction toggle — segmented control */}
      <div className="px-5 pt-6">
        <div className="grid grid-cols-2 border-[1.5px] border-ink">
          <button
            type="button"
            onClick={() => switchDirection('lend')}
            className={`py-3 px-4 font-display font-bold text-[15px] transition-colors ${
              direction === 'lend' ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-paper-soft'
            }`}
          >
            I <Italic>lent</Italic> something
          </button>
          <button
            type="button"
            onClick={() => switchDirection('borrow')}
            className={`py-3 px-4 font-display font-bold text-[15px] transition-colors border-l-[1.5px] border-ink ${
              direction === 'borrow' ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-paper-soft'
            }`}
          >
            I <Italic>borrowed</Italic> something
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="px-5 pt-6">
        {/* Item input */}
        <div className="mb-7 relative">
          <label className="label">{itemLabel}</label>
          <input
            className="input"
            required
            value={itemQuery}
            onChange={e => {
              setItemQuery(e.target.value);
              setSelectedItemId(null);
              if (direction === 'lend') setShowMatches(true);
            }}
            onFocus={() => { if (direction === 'lend') setShowMatches(true); }}
            onBlur={() => setTimeout(() => setShowMatches(false), 150)}
            placeholder={itemPlaceholder}
          />
          <Mono className="text-ink-soft mt-2 block">{itemHint}</Mono>

          {direction === 'lend' && showMatches && matches.length > 0 && (
            <ul className="absolute z-10 top-[78px] left-0 right-0 bg-paper border border-ink/30 shadow-lg max-h-60 overflow-auto">
              {matches.map(m => (
                <li key={m.id}>
                  <button
                    type="button"
                    onMouseDown={() => pickItem(m)}
                    className="w-full text-left px-3 py-2 hover:bg-paper-soft font-display text-[15px] text-ink"
                  >
                    {m.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Counterparty */}
        <div className="mb-7">
          <label className="label">{counterpartyLabel}</label>
          <input
            className="input"
            required
            value={counterpartyName}
            onChange={e => setCounterpartyName(e.target.value)}
            placeholder={counterpartyPlaceholder}
          />
        </div>

        <div className="mb-7">
          <label className="label">
            Their phone or email <span className="text-ink-soft">— optional</span>
          </label>
          <input
            className="input"
            value={counterpartyContact}
            onChange={e => setCounterpartyContact(e.target.value)}
            placeholder="+230 5… or name@example.com"
          />
          <Mono className="text-ink-soft mt-2 block">{claimNotice}</Mono>
        </div>

        {/* Dates */}
        <div className="mb-7">
          <label className="label">
            {lentOnLabel} <span className="text-ink-soft">— optional</span>
          </label>
          <input
            className="input"
            type="date"
            max={today}
            value={lentOn}
            onChange={e => setLentOn(e.target.value)}
          />
          <Mono className="text-ink-soft mt-2 block">
            Leave blank if you don&apos;t remember exactly.
          </Mono>
        </div>

        <label className="flex items-start gap-3 py-3 cursor-pointer border-t border-ink/15 mb-3">
          <input
            type="checkbox"
            checked={alreadyReturned}
            onChange={e => setAlreadyReturned(e.target.checked)}
            className="h-5 w-5 mt-0.5 shrink-0 accent-ink"
          />
          <span className="text-sm text-ink leading-snug">
            <strong className="font-display font-bold">
              {direction === 'lend' ? 'Already returned' : 'Already given back'}
            </strong>
            <span className="block text-ink-soft mt-0.5">
              {direction === 'lend'
                ? 'Logging this for the record — they brought it back already.'
                : 'Logging this for the record — you handed it back already.'}
            </span>
          </span>
        </label>

        {alreadyReturned ? (
          <div className="mb-7">
            <label className="label">{direction === 'lend' ? 'Returned on' : 'Given back on'}</label>
            <input
              className="input"
              type="date"
              max={today}
              min={lentOn}
              value={returnedOn}
              onChange={e => setReturnedOn(e.target.value)}
            />
          </div>
        ) : (
          <div className="mb-7">
            <label className="label">
              {direction === 'lend' ? 'Expected back by' : 'Need to return by'}{' '}
              <span className="text-ink-soft">— optional</span>
            </label>
            <input
              className="input"
              type="date"
              min={today}
              value={dueOn}
              onChange={e => setDueOn(e.target.value)}
            />
            <Mono className="text-ink-soft mt-2 block">Leave blank for open-ended.</Mono>
          </div>
        )}

        {/* Notes */}
        <div className="mb-7">
          <label className="label">Notes <span className="text-ink-soft">— optional, private to you</span></label>
          <textarea
            className="input min-h-[80px]"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={direction === 'lend' ? 'Condition when lent, where you handed it over, etc.' : 'Condition, where it lives in your place, etc.'}
          />
        </div>

        {error && <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>}

        <button
          type="submit"
          className="btn-primary w-full mt-2 flex justify-between items-center"
          disabled={busy}
        >
          <span>{busy ? 'Saving…' : <>Add to <Italic>sharing</Italic></>}</span>
          <span aria-hidden>→</span>
        </button>

        <div className="mt-5 text-center">
          <Link href="/loans" className="font-mono text-[10px] uppercase tracking-mono text-ink-soft hover:text-ink">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
