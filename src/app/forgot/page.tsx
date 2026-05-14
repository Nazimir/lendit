'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';

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
    <main className="min-h-screen bg-paper px-6 py-12 flex flex-col">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <Wordmark size={22} />
          <Mono className="text-ink-soft">Recovery</Mono>
        </div>

        <div className="mt-12">
          <h1 className="font-display font-extrabold text-[56px] leading-[0.85] tracking-[-0.045em] text-ink text-balance">
            Forgot <Italic>your</Italic> way in?
          </h1>
          <p className="font-display font-medium text-[16px] leading-[1.4] text-ink-soft mt-4 text-pretty">
            Tell us the email you used. We&apos;ll send a link that lets you set a new password.
          </p>
        </div>

        {sent ? (
          <div className="mt-10 border-y-[1.5px] border-ink py-6">
            <h2 className="font-display font-bold text-[24px] leading-tight tracking-[-0.02em] text-ink">
              Check your <Italic>email</Italic>.
            </h2>
            <p className="text-sm text-ink-soft mt-3">
              If an account exists for <strong className="text-ink">{email}</strong>, a reset link is on its way.
              The link expires in about an hour.
            </p>
            <Link href="/login" className="btn-secondary inline-flex mt-6">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10">
            <div className="mb-6">
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
            {error && <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>}
            <button className="btn-primary w-full mt-8 flex justify-between items-center" disabled={busy}>
              <span>{busy ? 'Sending…' : <>Send the <Italic>link</Italic></>}</span>
              <span aria-hidden>→</span>
            </button>
          </form>
        )}

        <div className="mt-auto pt-8 text-center">
          <Mono className="text-ink-soft">
            Remembered it?{' '}
            <Link href="/login" className="text-ink underline">Sign in</Link>
          </Mono>
        </div>
      </div>
    </main>
  );
}
