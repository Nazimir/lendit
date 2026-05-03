'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The recovery email link drops a temporary session into the URL hash.
  // supabase-js parses it automatically on init. We just need to wait a beat
  // and then check whether we ended up with a session.
  useEffect(() => {
    const sb = createClient();
    sb.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });
    return () => subscription.unsubscribe();
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
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <p className="text-sm text-gray-500">Checking link…</p>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm card p-6 text-center space-y-3">
          <h1 className="text-2xl font-semibold">Link invalid or expired</h1>
          <p className="text-sm text-gray-600">
            This reset link can&apos;t be used. It may have already been used,
            or it may have expired (links last about an hour).
          </p>
          <Link href="/forgot" className="btn-primary inline-block mt-2">Request a new link</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-block w-12 h-12 rounded-2xl bg-accent-400 mb-3" />
          <h1 className="text-2xl font-semibold">Set a new password</h1>
        </div>

        {done ? (
          <div className="card p-5 text-center">
            <p className="text-accent-700 font-medium">Password updated.</p>
            <p className="text-sm text-gray-600 mt-1">Taking you to the app…</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="label">New password</label>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">8+ characters.</p>
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
