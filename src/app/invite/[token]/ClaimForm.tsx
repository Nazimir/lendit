'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mono, Italic } from '@/components/typography';
import { PasswordInput } from '@/components/PasswordInput';
import { claimInvite } from '@/app/(app)/lend/actions';

/**
 * Two-step claim flow:
 *
 *   1. New user → fills signup form → "Create my account" → session created,
 *      page refreshes with isSignedIn=true.
 *   2. Signed-in user (whether long-time or just-signed-up two seconds ago)
 *      → sees explicit Accept this loan / Maybe later prompt → one tap to claim.
 *
 * Splitting signup from acceptance gives every recipient a clear, conscious
 * "yes I confirm this loan" moment, instead of bundling consent into the
 * sign-up button.
 */

export function ClaimForm({
  token, isSignedIn, recipientHint, lenderName
}: { token: string; isSignedIn: boolean; recipientHint: string; lenderName: string }) {
  if (isSignedIn) {
    return <AcceptOrDecline token={token} lenderName={lenderName} />;
  }
  return <NewUserSignup token={token} recipientHint={recipientHint} lenderName={lenderName} />;
}

/* ───────────────── Signed-in: explicit Accept / Maybe later ───────────────── */

function AcceptOrDecline({ token, lenderName }: { token: string; lenderName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true); setError(null);
    const result = await claimInvite(token);
    setBusy(false);
    if ('error' in result) { setError(result.error); return; }
    router.replace(`/loans/${result.loan_id}`);
    router.refresh();
  }

  return (
    <div className="border-y-[1.5px] border-ink py-6">
      <Mono className="text-ink-soft block mb-2">Your call</Mono>
      <h2 className="font-display font-bold text-[26px] leading-tight tracking-[-0.02em] text-ink">
        Accept this <Italic>loan</Italic>?
      </h2>
      <p className="text-sm text-ink-soft leading-relaxed mt-2">
        Tapping Accept tells {lenderName} you&apos;ve received the item and adds the loan to your app. You can mark it returned later, the same way.
      </p>

      {error && <p className="font-italic italic text-sm text-cat-tools mt-4">{error}</p>}

      <button
        onClick={accept}
        disabled={busy}
        className="btn-primary w-full mt-6 flex justify-between items-center"
      >
        <span>{busy ? 'Accepting…' : <>Yes, accept <Italic>this</Italic></>}</span>
        <span aria-hidden>→</span>
      </button>

      <div className="mt-4 text-center">
        <Link href="/home" className="font-mono text-[10px] uppercase tracking-mono text-ink-soft hover:text-ink">
          Maybe later
        </Link>
      </div>

      <Mono className="text-ink-soft block mt-6 leading-relaxed text-center">
        Not what you were lent? Just close this — the request expires on its own.
      </Mono>
    </div>
  );
}

/* ───────────────── New user: sign up, then refresh into Accept ───────────────── */

function NewUserSignup({ token, recipientHint, lenderName }: { token: string; recipientHint: string; lenderName: string }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(recipientHint || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmailConfirm, setPendingEmailConfirm] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const sb = createClient();

    const { data, error: signErr } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, suburb: '', phone: '' },
        emailRedirectTo: `${window.location.origin}/invite/${token}`
      }
    });
    if (signErr) { setError(signErr.message); setBusy(false); return; }

    if (!data.session) {
      // Email confirmation is on for this project. The user has to confirm
      // before they get a session. Tell them, and stop here.
      setPendingEmailConfirm(true);
      setBusy(false);
      return;
    }

    // Signed in straight away — refresh the parent server component so it
    // re-renders this page with isSignedIn=true, which switches us over to
    // the explicit Accept prompt. NO auto-claim — consent is its own step.
    setBusy(false);
    router.refresh();
  }

  if (pendingEmailConfirm) {
    return (
      <div className="border-y-[1.5px] border-ink py-6">
        <Mono className="text-ink-soft block mb-2">Almost there</Mono>
        <h2 className="font-display font-bold text-[24px] leading-tight tracking-[-0.02em] text-ink">
          Check your <Italic>email</Italic>.
        </h2>
        <p className="text-sm text-ink-soft mt-3 leading-relaxed">
          We sent a confirmation link to <strong className="text-ink font-semibold">{email}</strong>.
          Click it, come back to this page, and you&apos;ll see the Accept button for the loan from {lenderName}.
        </p>
        <p className="text-sm text-ink-soft mt-3 leading-relaxed">
          The invite link stays valid for 7 days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="border-y-[1.5px] border-ink py-6 mb-6">
        <Mono className="text-ink-soft block mb-2">Step 1 of 2</Mono>
        <h2 className="font-display font-bold text-[26px] leading-tight tracking-[-0.02em] text-ink">
          Create your <Italic>account</Italic>.
        </h2>
        <p className="font-display font-medium text-[15px] leading-[1.4] text-ink-soft mt-3">
          Then you&apos;ll see what {lenderName} is lending and tap Accept to confirm.
        </p>
      </div>

      <div className="mb-6">
        <label className="label">First name</label>
        <input
          className="input"
          required
          maxLength={40}
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
        />
      </div>
      <div className="mb-6">
        <label className="label">Email</label>
        <input
          className="input"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </div>
      <div className="mb-6">
        <label className="label">Password</label>
        <PasswordInput
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <Mono className="text-ink-soft mt-2 block">8+ characters</Mono>
      </div>

      {error && <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>}

      <button
        className="btn-primary w-full mt-6 flex justify-between items-center"
        disabled={busy}
      >
        <span>{busy ? 'Creating…' : <>Create <Italic>account</Italic></>}</span>
        <span aria-hidden>→</span>
      </button>

      <div className="mt-6 text-center">
        <Mono className="text-ink-soft">
          Already on Partaz?{' '}
          <Link href={`/login?next=/invite/${token}`} className="text-ink underline">
            Sign in instead
          </Link>
        </Mono>
      </div>
    </form>
  );
}
