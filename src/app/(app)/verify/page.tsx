'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}

function VerifyInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/home';

  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const sb = createClient();
    const { error } = await sb.auth.updateUser({ phone });
    setBusy(false);
    if (error) {
      setError(
        error.message + ' — your Supabase project may need an SMS provider (Twilio) configured under Authentication → Providers → Phone.'
      );
      return;
    }
    setInfo('Code sent. Check your phone.');
    setStage('code');
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const sb = createClient();
    const { error } = await sb.auth.verifyOtp({ phone, token: code, type: 'phone_change' });
    if (error) { setError(error.message); setBusy(false); return; }

    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      await sb.from('profiles').update({ phone, phone_verified: true }).eq('id', user.id);
    }
    setBusy(false);
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-10 flex flex-col">
      <div className="w-full max-w-md mx-auto">
        {/* Masthead */}
        <div className="flex justify-between items-center mb-10">
          <Wordmark size={22} />
          <div className="flex items-center gap-3">
            <Link href={next} className="text-ink-soft hover:text-ink">
              <Mono>← Back</Mono>
            </Link>
            <Mono className="text-ink-soft">Verify</Mono>
          </div>
        </div>

        {/* Headline */}
        <div>
          <h1 className="font-display font-extrabold text-[56px] leading-[0.88] tracking-[-0.045em] text-ink text-balance">
            One quick <Italic>check</Italic>.
          </h1>
          <p className="font-display font-medium text-[16px] leading-[1.4] text-ink-soft mt-4 text-pretty">
            Browsing is free for everyone. Before you can borrow, lend, or message someone, we ask you to verify a phone. Takes about 30 seconds. Other people never see your number.
          </p>
        </div>

        {stage === 'phone' && (
          <form onSubmit={sendCode} className="mt-10">
            <div className="mb-6">
              <label className="label">Phone number</label>
              <input
                className="input"
                type="tel"
                required
                placeholder="+230 5 XXX XXXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              <Mono className="text-ink-soft mt-2 block">Include the country code (e.g. +230).</Mono>
            </div>
            {error && <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>}
            {info && <p className="font-italic italic text-sm text-ink mt-3">{info}</p>}
            <button className="btn-primary w-full mt-6 flex justify-between items-center" disabled={busy}>
              <span>{busy ? 'Sending…' : <>Send the <Italic>code</Italic></>}</span>
              <span aria-hidden>→</span>
            </button>
            <Mono className="text-ink-soft mt-6 block text-center leading-relaxed">
              By continuing you agree to our{' '}
              <Link href="/terms" target="_blank" className="text-ink underline">Terms</Link>.
            </Mono>
          </form>
        )}

        {stage === 'code' && (
          <form onSubmit={verifyCode} className="mt-10">
            <div className="mb-6">
              <label className="label">Enter the 6-digit code</label>
              <input
                className="input text-center"
                style={{ letterSpacing: '0.4em', fontVariantNumeric: 'tabular-nums' }}
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
              />
              <Mono className="text-ink-soft mt-2 block">Sent to {phone}.</Mono>
            </div>
            {error && <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>}
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => { setStage('phone'); setCode(''); setError(null); }}
                disabled={busy}
              >Use a different number</button>
              <button className="btn-primary flex-1 flex justify-between items-center" disabled={busy || code.length !== 6}>
                <span>{busy ? 'Verifying…' : <>Verify <Italic>it</Italic></>}</span>
                <span aria-hidden>→</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
