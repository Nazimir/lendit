'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mono, Italic } from '@/components/typography';
import { PasswordInput } from '@/components/PasswordInput';
import { claimInvite } from '@/app/(app)/lend/actions';

export function ClaimForm({
  token, isSignedIn, recipientHint, lenderName
}: { token: string; isSignedIn: boolean; recipientHint: string; lenderName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signed-in: one-tap accept
  if (isSignedIn) {
    async function accept() {
      setBusy(true); setError(null);
      const result = await claimInvite(token);
      setBusy(false);
      if ('error' in result) { setError(result.error); return; }
      router.replace(`/loans/${result.loan_id}`);
      router.refresh();
    }

    return (
      <div>
        <p className="font-display font-medium text-[16px] leading-[1.4] text-ink-soft mb-6">
          Tap to accept and add this loan to your Partaz account.
        </p>
        {error && <p className="font-italic italic text-sm text-cat-tools mb-3">{error}</p>}
        <button
          onClick={accept}
          disabled={busy}
          className="btn-primary w-full flex justify-between items-center"
        >
          <span>{busy ? 'Accepting…' : <>Accept this <Italic>loan</Italic></>}</span>
          <span aria-hidden>→</span>
        </button>
      </div>
    );
  }

  return <NewUserSignup token={token} recipientHint={recipientHint} lenderName={lenderName} />;
}

function NewUserSignup({ token, recipientHint, lenderName }: { token: string; recipientHint: string; lenderName: string }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(recipientHint || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError('Check your email for a confirmation link, then come back to this page.');
      setBusy(false);
      return;
    }

    const result = await claimInvite(token);
    setBusy(false);
    if ('error' in result) { setError(result.error); return; }
    router.replace(`/loans/${result.loan_id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <div className="border-y-[1.5px] border-ink py-6 mb-6">
        <h2 className="font-display font-bold text-[26px] leading-tight tracking-[-0.02em] text-ink">
          Make a <Italic>quick</Italic> account.
        </h2>
        <p className="font-display font-medium text-[15px] leading-[1.4] text-ink-soft mt-3">
          As soon as you&apos;re in, the loan from {lenderName} lands in your app.
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
        <span>{busy ? 'Setting up…' : <>Sign up & <Italic>accept</Italic></>}</span>
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
