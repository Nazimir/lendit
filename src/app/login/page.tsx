'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/home';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setBusy(false); return; }
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-12 flex flex-col">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <Wordmark size={22} asLink={false} />
          <Mono className="text-ink-soft">Mauritius · v0.1</Mono>
        </div>

        <div className="mt-12">
          <h1 className="font-display font-extrabold text-[64px] leading-[0.85] tracking-[-0.045em] text-ink">
            Welcome <Italic>back</Italic>.
          </h1>
          <p className="font-display font-medium text-[17px] leading-[1.4] text-ink-soft mt-4">
            Pick up where you left off.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-10 flex-1">
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
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Password</label>
              <Link href="/forgot" className="font-mono text-[10px] uppercase tracking-mono text-ink-soft hover:text-ink">
                Forgot?
              </Link>
            </div>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="font-italic italic text-sm text-cat-tools mt-4">{error}</p>}

          <button className="btn-primary w-full mt-10 flex justify-between items-center" disabled={busy}>
            <span>{busy ? 'Signing in…' : <>Sign <Italic>in</Italic></>}</span>
            <span aria-hidden>→</span>
          </button>
        </form>

        <div className="mt-6 text-center">
          <Mono className="text-ink-soft">
            New here?{' '}
            <Link href="/signup" className="text-ink underline">Make a shelf</Link>
          </Mono>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
