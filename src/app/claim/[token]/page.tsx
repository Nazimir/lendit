'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';
import { GoogleButton, OrDivider } from '@/components/GoogleButton';
import { dateLabel } from '@/lib/utils';

type Summary = {
  status: 'pending' | 'claimed' | 'rejected' | 'expired' | 'cancelled';
  expires_at: string;
  /** 'lender_invites' (lender shared, asking you to confirm you're the borrower)
   *  | 'borrower_invites' (borrower shared, asking you to confirm you're the lender)
   *  | 'closed' (both sides already claimed) */
  direction: 'lender_invites' | 'borrower_invites' | 'closed';
  /** First name of the user who created the loan (asserter side). */
  asserter_first_name: string | null;
  /** Free-text name they used to identify you. */
  counterparty_hint: string | null;
  item_title: string | null;
  lent_on: string | null;
  due_on: string | null;
};

/**
 * Claim page — the bridge between a manual loan record and a real account.
 * Public route, works both signed-in and signed-out:
 *   - signed out: show summary + "make a shelf" / "sign in" / Google options,
 *     all carrying ?next=/claim/[token] so the user returns here post-auth
 *   - signed in: show "Yep that's me" (claim) and "Not me" (reject) buttons
 *
 * Token states besides `pending` get a tailored message — no buttons, no
 * dead-ends.
 */
export default function ClaimPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const token = params.token;
  const nextHref = `/claim/${encodeURIComponent(token)}`;

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();

      const [{ data: { user } }, { data: summaryData, error: summaryError }] = await Promise.all([
        sb.auth.getUser(),
        sb.rpc('get_loan_claim_summary', { p_token: token })
      ]);

      setSignedIn(!!user);

      if (summaryError) {
        setError(summaryError.message);
        setLoading(false);
        return;
      }
      const row = (summaryData?.[0] ?? null) as Summary | null;
      if (!row) {
        setNotFound(true);
      } else {
        setSummary(row);
      }
      setLoading(false);
    })();
  }, [token]);

  async function confirm() {
    setBusy(true); setError(null);
    const sb = createClient();
    const { data, error } = await sb.rpc('claim_loan', { p_token: token });
    if (error) { setError(error.message); setBusy(false); return; }
    router.replace(`/loans/${data}`);
    router.refresh();
  }

  async function reject() {
    if (!confirm_native("That's not you? We'll let the lender know.")) return;
    setBusy(true); setError(null);
    const sb = createClient();
    const { error } = await sb.rpc('reject_loan_claim', { p_token: token });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setRejected(true);
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-10 flex flex-col">
      <div className="w-full max-w-md mx-auto">
        {/* Masthead */}
        <div className="flex justify-between items-center mb-10">
          <Wordmark size={22} />
          <Mono className="text-ink-soft">Claim</Mono>
        </div>

        {loading && (
          <p className="font-italic italic text-ink-soft">Looking up the loan…</p>
        )}

        {!loading && notFound && (
          <Dead title="This link doesn't lead anywhere." body="It may have been mistyped, cancelled, or never existed. Check with the person who sent it." />
        )}

        {!loading && summary && summary.status === 'claimed' && (
          <Dead title="Already claimed." body="Someone — maybe you — already linked this loan to an account. If that wasn't you, ask the lender to send a fresh link." />
        )}

        {!loading && summary && summary.status === 'expired' && (
          <Dead title="This link has expired." body="Claim links last 7 days. Ask the lender for a fresh one if you still want to track this loan." />
        )}

        {!loading && summary && summary.status === 'rejected' && (
          <Dead title="This link was already declined." body="If that was a mistake, ask the lender to send a new one." />
        )}

        {!loading && summary && summary.status === 'cancelled' && (
          <Dead title="This link was cancelled." body="The lender generated a newer one. Ask them to share the latest." />
        )}

        {rejected && (
          <Dead title="Thanks for letting us know." body="The lender will see you flagged this. They can edit or delete the entry on their side." />
        )}

        {!loading && !rejected && summary && summary.status === 'pending' && (
          <>
            {/* Summary card — copy adapts to direction */}
            <h1 className="font-display font-extrabold text-[44px] leading-[0.9] tracking-[-0.04em] text-ink text-balance">
              Is this <Italic>you</Italic>?
            </h1>
            <p className="font-display font-medium text-[16px] leading-[1.4] text-ink-soft mt-4 text-pretty">
              <span className="text-ink font-bold">{summary.asserter_first_name || 'Someone'}</span>
              {' '}says they{' '}
              {summary.direction === 'lender_invites' ? 'lent ' : 'borrowed '}
              <span className="text-ink font-bold">{summary.item_title || 'something'}</span>
              {' '}
              {summary.direction === 'lender_invites' ? 'to ' : 'from '}
              {summary.counterparty_hint && (
                <span className="text-ink font-bold">{summary.counterparty_hint}</span>
              )}
              {!summary.counterparty_hint && <span className="text-ink font-bold">you</span>}
              {summary.lent_on && <> on <span className="text-ink">{dateLabel(summary.lent_on)}</span></>}
              .
              {summary.due_on && (
                <> {summary.direction === 'lender_invites' ? 'Due back' : 'Need it back by'}{' '}
                <span className="text-ink">{dateLabel(summary.due_on)}</span>.</>
              )}
            </p>

            <div className="mt-6 p-4 bg-cat-kitchen border border-ink/10">
              <Mono className="text-ink-soft block">
                Claiming links this loan to your Partaz account so you can both see it. The lender keeps their record either way — your claim just adds your side.
              </Mono>
            </div>

            {error && <p className="font-italic italic text-sm text-cat-tools mt-4">{error}</p>}

            {/* Action buttons depend on auth state */}
            {signedIn === true && (
              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={confirm}
                  disabled={busy}
                  className="btn-primary w-full flex justify-between items-center"
                >
                  <span>{busy ? 'Linking…' : <>Yep, that&apos;s <Italic>me</Italic></>}</span>
                  <span aria-hidden>→</span>
                </button>
                <button
                  type="button"
                  onClick={reject}
                  disabled={busy}
                  className="w-full py-3 font-mono text-[11px] uppercase tracking-mono text-ink-soft hover:text-cat-tools transition-colors"
                >
                  Not me — let the lender know
                </button>
              </div>
            )}

            {signedIn === false && (
              <div className="mt-8">
                <GoogleButton next={nextHref} />
                <OrDivider text="or" />
                <div className="flex flex-col gap-3">
                  <Link
                    href={`/signup?next=${encodeURIComponent(nextHref)}`}
                    className="btn-secondary w-full flex justify-between items-center"
                  >
                    <span>Make a <Italic>shelf</Italic></span>
                    <span aria-hidden>→</span>
                  </Link>
                  <Link
                    href={`/login?next=${encodeURIComponent(nextHref)}`}
                    className="w-full py-3 text-center font-mono text-[11px] uppercase tracking-mono text-ink-soft hover:text-ink transition-colors"
                  >
                    I already have an account
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={reject}
                  disabled={busy}
                  className="w-full mt-4 py-3 font-mono text-[11px] uppercase tracking-mono text-ink-soft hover:text-cat-tools transition-colors"
                >
                  Not me — let the lender know
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Dead({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h1 className="font-display font-extrabold text-[36px] leading-[0.95] tracking-[-0.03em] text-ink text-balance">
        {title}
      </h1>
      <p className="font-display font-medium text-[15px] leading-[1.45] text-ink-soft mt-4 text-pretty">
        {body}
      </p>
      <Link href="/" className="inline-block mt-8 font-mono text-[11px] uppercase tracking-mono text-ink-soft hover:text-ink">
        ← Back to Partaz
      </Link>
    </div>
  );
}

// Shadowed window.confirm so we can stub in tests if needed.
function confirm_native(msg: string): boolean {
  return window.confirm(msg);
}
