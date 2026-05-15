'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';
import { PasswordInput } from '@/components/PasswordInput';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // If the URL hash carries an access token, a recovery is in flight
    // and we should give Supabase time to exchange it before declaring
    // the link dead. Without this, getSession() can resolve with null
    // a beat before the PASSWORD_RECOVERY event fires and flip us into
    // the "Link invalid" state prematurely.
    const hashHasToken = window.location.hash.includes('access_token=');
    const sb = createClient();
    let resolved = false;

    const accept = () => {
      if (resolved) return;
      resolved = true;
      setHasSession(true);
    };
    const reject = () => {
      if (resolved) return;
      resolved = true;
      setHasSession(false);
    };

    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) accept();
      else if (!hashHasToken) reject();
      // else: hash has a token, wait for the auth event
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) accept();
    });

    // Safety net: if we're still waiting after 6s, give up.
    const t = setTimeout(reject, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords don\'t match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setBusy(true); setError(null);
    const sb = createClient();
    const { error } = await sb.auth.updateUser({ password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => {
      router.replace('/home');
      router.refresh();
    }, 1500);
  }

  if (hasSession === null) {
    return (
      <main className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
        <Mono className="text-ink-soft">Checking link…</Mono>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="min-h-screen bg-paper px-6 py-12 flex flex-col">
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <Wordmark size={22} />
            <Mono className="text-ink-soft">Recovery</Mono>
          </div>
          <div className="mt-12 border-y-[1.5px] border-ink py-6">
            <h1 className="font-display font-extrabold text-[40px] leading-[0.9] tracking-[-0.035em] text-ink">
              Link <Italic>invalid</Italic> or expired.
            </h1>
            <p className="text-sm text-ink-soft mt-3">
              This reset link can&apos;t be used. It may have already been used, or it may have expired (links last about an hour).
            </p>
            <Link href="/forgot" className="btn-primary inline-flex mt-6 justify-between items-center">
              <span>Request a new <Italic>link</Italic></span>
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-12 flex flex-col">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <Wordmark size={22} />
          <Mono className="text-ink-soft">Recovery</Mono>
        </div>

        <div className="mt-12">
          <h1 className="font-display font-extrabold text-[56px] leading-[0.85] tracking-[-0.045em] text-ink">
            Set a <Italic>new</Italic> one.
          </h1>
          <p className="font-display font-medium text-[16px] leading-[1.4] text-ink-soft mt-4">
            Pick a password you can remember. Eight characters minimum.
          </p>
        </div>

        {done ? (
          <div className="mt-10 border-y-[1.5px] border-ink py-6">
            <h2 className="font-display font-bold text-[24px] leading-tight tracking-[-0.02em] text-ink">
              Password <Italic>updated</Italic>.
            </h2>
            <Mono className="text-ink-soft mt-2 block">Taking you to the app…</Mono>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10">
            <div className="mb-6">
              <label className="label">New password</label>
              <PasswordInput
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <Mono className="text-ink-soft mt-2 block">8+ characters</Mono>
            </div>
            <div className="mb-6">
              <label className="label">Confirm new password</label>
              <PasswordInput
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </div>
            {error && <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>}
            <button className="btn-primary w-full mt-8 flex justify-between items-center" disabled={busy}>
              <span>{busy ? 'Saving…' : <>Update <Italic>password</Italic></>}</span>
              <span aria-hidden>→</span>
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
