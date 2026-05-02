'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/PageHeader';

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
    // Supabase auth.updateUser({ phone }) sends an OTP to the new phone
    const { error } = await sb.auth.updateUser({ phone });
    setBusy(false);
    if (error) {
      // Common case: project doesn't have an SMS provider configured.
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

    // Mark profile as phone-verified
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      await sb.from('profiles').update({ phone, phone_verified: true }).eq('id', user.id);
    }
    setBusy(false);
    router.replace(next);
    router.refresh();
  }

  return (
    <main>
      <PageHeader title="Verify your phone" back={next} />
      <div className="px-4 max-w-2xl mx-auto pb-8 space-y-4">
        <div className="card p-5">
          <h2 className="font-display text-2xl">One-time check</h2>
          <p className="text-sm text-gray-700 mt-2">
            Browsing is free for everyone. Before you can borrow, lend, or message
            another person, we ask you to verify a phone number. It takes about
            30 seconds and stays private — other users never see your number.
          </p>
        </div>

        {stage === 'phone' && (
          <form onSubmit={sendCode} className="card p-4 space-y-3">
            <div>
              <label className="label">Phone number</label>
              <input
                className="input"
                type="tel"
                required
                placeholder="+61 4XX XXX XXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              <p className="text-[11px] text-gray-500 mt-1">Include the country code (e.g. +61).</p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-accent-700">{info}</p>}
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
            <p className="text-[11px] text-gray-500">
              By continuing you agree to our{' '}
              <Link href="/terms" target="_blank" className="text-accent-700 underline">Terms</Link>.
            </p>
          </form>
        )}

        {stage === 'code' && (
          <form onSubmit={verifyCode} className="card p-4 space-y-3">
            <div>
              <label className="label">Enter the 6-digit code</label>
              <input
                className="input tracking-[0.4em] text-center"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
              />
              <p className="text-[11px] text-gray-500 mt-1">Sent to {phone}.</p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => { setStage('phone'); setCode(''); setError(null); }}
                disabled={busy}
              >Use a different number</button>
              <button className="btn-primary flex-1" disabled={busy || code.length !== 6}>
                {busy ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
