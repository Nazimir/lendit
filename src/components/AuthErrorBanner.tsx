'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mono, Italic } from '@/components/typography';

/**
 * When a Supabase email link (password recovery, magic link, signup
 * confirmation) is expired, invalid, or already used, Supabase redirects
 * the user back to the Site URL with an error fragment, e.g.
 *
 *   /login#error=access_denied&error_code=otp_expired&error_description=...
 *
 * Without this banner, the user lands on a normal page (most likely
 * /login) with no explanation of what just happened. With it, we read
 * the hash on mount, surface an editorial notice, and offer a direct
 * path to a fresh link.
 *
 * The hash is wiped from the URL so a refresh doesn't re-trigger the
 * banner — and so the error string doesn't linger in the address bar.
 */

type ErrorInfo = {
  code: string;
  description: string;
};

export function AuthErrorBanner() {
  const [err, setErr] = useState<ErrorInfo | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.slice(1); // strip leading #
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const error = params.get('error');
    const code = params.get('error_code');
    const description = params.get('error_description');

    // Only react to actual auth-flow errors. A page that happens to
    // have its own hash (e.g. #section-foo) shouldn't trigger this.
    if (!error && !code) return;

    setErr({
      code: code || error || 'unknown',
      description: description ? decodeURIComponent(description.replace(/\+/g, ' ')) : ''
    });

    // Clean the hash from the address bar.
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  if (!err) return null;

  const isExpired = err.code === 'otp_expired';
  const isDenied = err.code === 'access_denied' && !isExpired;

  return (
    <div className="bg-cat-kitchen border-b-[1.5px] border-ink">
      <div className="max-w-2xl mx-auto px-6 py-4 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <Mono className="text-ink/70 block mb-1">Notice</Mono>
          <p className="font-display font-bold text-[17px] tracking-[-0.015em] text-ink leading-tight">
            {isExpired
              ? <>That link&apos;s <Italic>expired</Italic>.</>
              : isDenied
                ? <>Sign-in <Italic>denied</Italic>.</>
                : <>Something <Italic>went wrong</Italic>.</>}
          </p>
          <p className="text-sm text-ink/80 mt-1 leading-snug">
            {isExpired
              ? 'Recovery links last about an hour. Get a fresh one and try again.'
              : err.description || 'Try again in a moment.'}
          </p>
        </div>
        {isExpired && (
          <Link
            href="/forgot"
            className="shrink-0 font-mono text-[10px] uppercase tracking-mono bg-ink text-paper px-3 py-2 hover:bg-ink-soft transition self-center"
          >
            Fresh link →
          </Link>
        )}
        <button
          type="button"
          onClick={() => setErr(null)}
          aria-label="Dismiss notice"
          className="shrink-0 text-ink/60 hover:text-ink transition px-1 text-2xl leading-none self-start"
        >
          ×
        </button>
      </div>
    </div>
  );
}
