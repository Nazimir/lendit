'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmInner />
    </Suspense>
  );
}

function ConfirmInner() {
  const router = useRouter();
  const search = useSearchParams();
  const emailFromQuery = search.get('email') || '';

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0); // seconds remaining before next resend allowed

  // Countdown for the resend cooldown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError('Please enter the email you signed up with.'); return; }
    setBusy(true); setError(null); setInfo(null);
    const sb = createClient();
    // For new-signup email confirmation, type is 'signup'. On success
    // Supabase returns a session, so the user is signed in afterwards.
    const { error } = await sb.auth.verifyOtp({ email, token: code, type: 'signup' });
    if (error) {
      setError(prettyError(error.message));
      setBusy(false);
      return;
    }
    router.replace('/home');
    router.refresh();
  }

  async function resend() {
    if (!email) { setError('Enter your email above first, then tap Resend.'); return; }
    setBusy(true); setError(null); setInfo(null);
    const sb = createClient();
    const { error } = await sb.auth.resend({ type: 'signup', email });
    setBusy(false);
    if (error) {
      setError(prettyError(error.message));
      return;
    }
    setInfo('New code sent. Check your inbox (and spam, just in case).');
    setResendIn(60);
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-10 flex flex-col">
      <div className="w-full max-w-md mx-auto">
        {/* Masthead */}
        <div className="flex justify-between items-center mb-10">
          <Wordmark size={22} />
          <Mono className="text-ink-soft">Confirm email</Mono>
        </div>

        {/* Headline */}
        <div>
          <h1 className="font-display font-extrabold text-[56px] leading-[0.88] tracking-[-0.045em] text-ink text-balance">
            Check your <Italic>inbox</Italic>.
          </h1>
          <p className="font-display font-medium text-[16px] leading-[1.4] text-ink-soft mt-4 text-pretty">
            We sent you a code. Pop it in below to finish setting up your shelf. The code expires in an hour — if it doesn&apos;t arrive, hit Resend.
          </p>
        </div>

        <form onSubmit={verifyCode} className="mt-10">
          {/* Email — editable in case the user landed here without a query param,
              or typoed their address on signup. */}
          <div className="mb-6">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-6">
            <label className="label">Confirmation code</label>
            <input
              className="input text-center"
              style={{ letterSpacing: '0.4em', fontVariantNumeric: 'tabular-nums' }}
              inputMode="numeric"
              pattern="[0-9]{6,10}"
              maxLength={10}
              required
              autoComplete="one-time-code"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="••••••"
            />
            <Mono className="text-ink-soft mt-2 block">From the email.</Mono>
          </div>

          {error && <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>}
          {info && <p className="font-italic italic text-sm text-ink mt-3">{info}</p>}

          <button
            className="btn-primary w-full mt-6 flex justify-between items-center"
            disabled={busy || code.length < 6 || !email}
          >
            <span>{busy ? 'Checking…' : <>Confirm <Italic>email</Italic></>}</span>
            <span aria-hidden>→</span>
          </button>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={resend}
              disabled={busy || resendIn > 0}
              className="font-mono text-[10px] uppercase tracking-mono text-ink-soft hover:text-ink disabled:text-ink-soft/50 disabled:cursor-not-allowed"
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
            <Link
              href="/signup"
              className="font-mono text-[10px] uppercase tracking-mono text-ink-soft hover:text-ink"
            >
              Wrong email? Start over
            </Link>
          </div>
        </form>

        <div className="mt-10 text-center">
          <Mono className="text-ink-soft">
            Already confirmed?{' '}
            <Link href="/login" className="text-ink underline">Sign in</Link>
          </Mono>
        </div>
      </div>
    </main>
  );
}

// Supabase error messages are technical. Translate the common ones.
function prettyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('expired') || m.includes('invalid')) {
    return 'That code didn\'t work — it may be expired or mistyped. Tap Resend and try the newest one.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many tries. Wait a minute, then try again.';
  }
  if (m.includes('not found') || m.includes('no user')) {
    return 'We can\'t find an account with that email. Try signing up first.';
  }
  return msg;
}
