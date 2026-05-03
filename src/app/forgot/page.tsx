'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset`
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-block w-12 h-12 rounded-2xl bg-accent-400 mb-3" />
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-gray-500 text-sm mt-1">
            We&apos;ll send a link to your email that lets you set a new one.
          </p>
        </div>

        {sent ? (
          <div className="card p-5 text-center space-y-3">
            <p className="text-accent-700 font-medium">Check your email.</p>
            <p className="text-sm text-gray-600">
              If an account exists for {email}, a reset link is on its way.
              The link expires in about an hour.
            </p>
            <Link href="/login" className="btn-secondary inline-block mt-2">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600 mt-6">
          Remembered it?{' '}
          <Link href="/login" className="text-accent-600 font-medium">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
