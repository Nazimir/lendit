'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mono, Italic } from '@/components/typography';

type ItemMatch = { id: string; title: string };

/**
 * Manual loan logging — the cornerstone "I lent this to someone" form.
 * Lets the user record a loan they've already made (or are making) to
 * someone who doesn't necessarily have a Partaz account. The borrower's
 * name is free text; we auto-create a private stub item if the title
 * doesn't match an existing one in the user's shelf.
 *
 * Submits via the create_manual_loan RPC, which handles stub creation +
 * loan insert atomically server-side.
 */
export default function NewLoanPage() {
  const router = useRouter();

  // Item picker — combobox over the current user's items.
  const [itemQuery, setItemQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [showMatches, setShowMatches] = useState(false);

  // Borrower fields
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerContact, setBorrowerContact] = useState('');

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

  // Fetch matching items as the user types.
  useEffect(() => {
    if (itemQuery.trim().length === 0) {
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
  }, [itemQuery]);

  function pickItem(item: ItemMatch) {
    setItemQuery(item.title);
    setSelectedItemId(item.id);
    setShowMatches(false);
  }

  function clearItemSelection() {
    // If the user edits the field after selecting, the selection becomes
    // stale — drop it so we treat the new text as a stub-to-create.
    setSelectedItemId(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!borrowerName.trim()) { setError('Borrower name is required.'); return; }
    if (!itemQuery.trim())    { setError('Item name is required.'); return; }
    setBusy(true); setError(null);

    const sb = createClient();
    const handoverAt = new Date(lentOn + 'T12:00:00').toISOString();
    const dueAt      = dueOn ? new Date(dueOn + 'T12:00:00').toISOString() : null;
    const returnedAt = alreadyReturned ? new Date(returnedOn + 'T12:00:00').toISOString() : null;

    const { data, error } = await sb.rpc('create_manual_loan', {
      p_item_id:           selectedItemId,
      p_item_title:        selectedItemId ? null : itemQuery.trim(),
      p_borrower_name:     borrowerName.trim(),
      p_borrower_contact:  borrowerContact.trim() || null,
      p_handover_at:       handoverAt,
      p_due_at:            dueAt,
      p_already_returned:  alreadyReturned,
      p_returned_at:       returnedAt,
      p_notes:             notes.trim() || null
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    // data is the new loan id. Bounce to /loans for now — Phase 2 will
    // route through a "send claim link?" intermediate step.
    router.replace(`/loans/${data}`);
    router.refresh();
  }

  return (
    <main className="max-w-2xl mx-auto pb-16">
      {/* Masthead — matches /loans editorial style. */}
      <header className="px-5 pt-12 pb-5 bg-paper border-b-[1.5px] border-ink">
        <div className="flex justify-between items-center">
          <Link href="/loans" className="text-ink-soft hover:text-ink">
            <Mono>← Ledger</Mono>
          </Link>
          <Mono className="text-ink-soft">New entry</Mono>
        </div>
        <h1 className="mt-3 font-display font-extrabold text-[44px] leading-[0.88] tracking-[-0.045em] text-ink">
          Log a <Italic>loan</Italic>.
        </h1>
        <p className="font-display font-medium text-[15px] leading-[1.35] text-ink-soft mt-2.5">
          Add something you&apos;ve already lent — even if the borrower isn&apos;t on Partaz.
        </p>
      </header>

      <form onSubmit={onSubmit} className="px-5 pt-6">
        {/* Item picker */}
        <div className="mb-7 relative">
          <label className="label">Item</label>
          <input
            className="input"
            required
            value={itemQuery}
            onChange={e => { setItemQuery(e.target.value); clearItemSelection(); setShowMatches(true); }}
            onFocus={() => setShowMatches(true)}
            onBlur={() => setTimeout(() => setShowMatches(false), 150)}
            placeholder="e.g. Bosch drill, ladder, blue Tupperware"
          />
          <Mono className="text-ink-soft mt-2 block">
            {selectedItemId
              ? 'Picked from your shelf.'
              : 'New name? We’ll add a quiet placeholder to your shelf — fill in the photo later.'}
          </Mono>

          {showMatches && matches.length > 0 && (
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

        {/* Borrower */}
        <div className="mb-7">
          <label className="label">Lent to</label>
          <input
            className="input"
            required
            value={borrowerName}
            onChange={e => setBorrowerName(e.target.value)}
            placeholder="First name, nickname, however you remember them"
          />
        </div>

        <div className="mb-7">
          <label className="label">Their phone or email <span className="text-ink-soft">— optional</span></label>
          <input
            className="input"
            value={borrowerContact}
            onChange={e => setBorrowerContact(e.target.value)}
            placeholder="+230 5… or name@example.com"
          />
          <Mono className="text-ink-soft mt-2 block">
            Useful later if you want to send them a claim link to track it on their side.
          </Mono>
        </div>

        {/* Dates */}
        <div className="mb-7">
          <label className="label">Lent on</label>
          <input
            className="input"
            type="date"
            max={today}
            value={lentOn}
            onChange={e => setLentOn(e.target.value)}
          />
        </div>

        <label className="flex items-start gap-3 py-3 cursor-pointer border-t border-ink/15 mb-3">
          <input
            type="checkbox"
            checked={alreadyReturned}
            onChange={e => setAlreadyReturned(e.target.checked)}
            className="h-5 w-5 mt-0.5 shrink-0 accent-ink"
          />
          <span className="text-sm text-ink leading-snug">
            <strong className="font-display font-bold">Already returned</strong>
            <span className="block text-ink-soft mt-0.5">
              Logging this for the record — they brought it back already.
            </span>
          </span>
        </label>

        {alreadyReturned ? (
          <div className="mb-7">
            <label className="label">Returned on</label>
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
            <label className="label">Expected back by <span className="text-ink-soft">— optional</span></label>
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
            placeholder="Condition when lent, where you handed it over, etc."
          />
        </div>

        {error && <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>}

        <button
          type="submit"
          className="btn-primary w-full mt-2 flex justify-between items-center"
          disabled={busy}
        >
          <span>{busy ? 'Saving…' : <>Add to <Italic>ledger</Italic></>}</span>
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
