'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Italic } from '@/components/typography';

type Props = {
  /** Where to send the user after Google completes. Defaults to /loans. */
  next?: string;
  /** Custom label override — defaults to "Continue with Google". */
  label?: string;
};

/**
 * One-tap Google OAuth button. Renders a white outlined pill with the
 * official multi-colour G mark. On click, Supabase kicks off the OAuth
 * dance and redirects back to /auth/callback, which exchanges the code
 * for a session and lands the user wherever `next` points.
 */
export function GoogleButton({ next = '/loans', label }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    });
    if (error) {
      // OAuth init failure (network, misconfig). The successful path
      // redirects to Google immediately, so we never reach setBusy(false)
      // unless something actually broke client-side.
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        className="w-full py-4 px-6 bg-white border border-ink/20 flex items-center justify-center gap-3 font-display text-[16px] font-medium text-ink hover:bg-ink/[0.03] active:bg-ink/[0.05] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <GoogleIcon />
        <span>{busy ? 'Redirecting…' : (label ?? <>Continue with <Italic>Google</Italic></>)}</span>
      </button>
      {error && (
        <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/**
 * Reusable "or use email" divider for placing between GoogleButton and
 * a traditional email/password form.
 */
export function OrDivider({ text = 'or use email' }: { text?: string }) {
  return (
    <div className="my-6 flex items-center gap-4">
      <div className="flex-1 h-px bg-ink/15" />
      <span className="font-mono text-[10px] uppercase tracking-mono text-ink-soft">{text}</span>
      <div className="flex-1 h-px bg-ink/15" />
    </div>
  );
}
