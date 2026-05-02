'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
      <div className="card p-5 space-y-3">
        <p className="text-sm text-gray-700">
          Tap to accept and add this loan to your LendIt account.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={accept} disabled={busy} className="btn-primary w-full">
          {busy ? 'Accepting…' : 'Accept this loan'}
        </button>
      </div>
    );
  }

  // Not signed in: tiny signup form
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

    // Sign up
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

    // Auto-claim the invite
    const result = await claimInvite(token);
    setBusy(false);
    if ('error' in result) { setError(result.error); return; }
    router.replace(`/loans/${result.loan_id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-3">
      <h2 className="font-display text-2xl">Quick — create your account</h2>
      <p className="text-sm text-gray-600">
        We just need a few details. As soon as you&apos;re in, the loan from {lenderName} is in your app.
      </p>
      <div>
        <label className="label">First name</label>
        <input className="input" required maxLength={40} value={firstName} onChange={e => setFirstName(e.target.value)} />
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label">Password</label>
        <input className="input" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} />
        <p className="text-[11px] text-gray-500 mt-1">8+ characters.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? 'Setting up…' : 'Sign up & accept'}
      </button>
      <p className="text-center text-xs text-gray-500">
        Already have an account?{' '}
        <Link href={`/login?next=/invite/${token}`} className="text-accent-600 font-medium">
          Sign in instead
        </Link>
      </p>
    </form>
  );
}
