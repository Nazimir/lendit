'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ProgressBanner } from '@/components/Spinner';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';
import { PasswordInput } from '@/components/PasswordInput';
import { GoogleButton, OrDivider } from '@/components/GoogleButton';

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/home';
  const [firstName, setFirstName] = useState('');
  const [suburb, setSuburb] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError('Please confirm you are 18 or older and agree to the Terms.');
      return;
    }
    setBusy(true); setError(null); setInfo(null);
    const supabase = createClient();

    setProgress('Creating your account…');
    // Pass TOS + adult-attestation in user_metadata so the handle_new_user
    // database trigger writes them atomically with profile creation. We can't
    // .update() the profile from here — at this point the user has no session
    // yet (email confirmation pending) so RLS blocks any client-side writes.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          suburb,
          phone,
          tos_accepted_at: new Date().toISOString(),
          is_adult_attested: true
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) { setError(error.message); setBusy(false); setProgress(null); return; }

    // Profile photo upload is deferred to /profile after the user is signed in —
    // pre-confirmation uploads fail silently under storage RLS. Users get a
    // "complete your profile" prompt post-signup. (See task #7 follow-up notes.)

    if (data.session) {
      router.replace(next);
      router.refresh();
      return;
    }

    const nextParam = next !== '/home' ? `&next=${encodeURIComponent(next)}` : '';

    // Supabase's anti-enumeration safety: if the email is already registered,
    // signUp() succeeds silently — no error, no email sent — but returns the
    // user with an empty `identities` array. Without this check the user would
    // sit on /confirm-email forever waiting for a code that's never coming.
    // See: https://supabase.com/docs/reference/javascript/auth-signup
    if (data.user && (data.user.identities ?? []).length === 0) {
      router.replace(`/login?email=${encodeURIComponent(email)}&exists=1${nextParam}`);
      return;
    }

    // Email confirmation required. Hand the user to the OTP entry page
    // rather than a dead-end "check your email" message — codes don't
    // suffer the cross-browser / link-expiration trap that magic links do.
    router.replace(`/confirm-email?email=${encodeURIComponent(email)}${nextParam}`);
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-12 flex flex-col">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <Wordmark size={22} asLink={false} />
          <Mono className="text-ink-soft">Mauritius · v0.1</Mono>
        </div>

        <div className="mt-10">
          <h1 className="font-display font-extrabold text-[64px] leading-[0.85] tracking-[-0.045em] text-ink text-balance">
            Borrow<br /><Italic>before</Italic> you buy.
          </h1>
          <p className="font-display font-medium text-[17px] leading-[1.4] text-ink-soft mt-4 text-pretty">
            A neighbourhood shelf. Free, forever. First-name basis. Bring it back when you&apos;re done.
          </p>
        </div>

        <div className="mt-10">
          <GoogleButton next={next} />
          <OrDivider />
        </div>

        <form onSubmit={onSubmit} className="mt-0">
          <div className="mb-6">
            <label className="label">First name</label>
            <input className="input" required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="What neighbours call you" />
          </div>
          <div className="mb-6">
            <label className="label">Suburb / town</label>
            <input className="input" required placeholder="Curepipe, Quatre Bornes…" value={suburb} onChange={e => setSuburb(e.target.value)} />
          </div>
          <div className="mb-6">
            <label className="label">Phone (optional)</label>
            <input className="input" type="tel" placeholder="+230 …" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="mb-6">
            <label className="label">Email</label>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="mb-6">
            <label className="label">Password</label>
            <PasswordInput autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} />
            <Mono className="text-ink-soft mt-2 block">8+ characters</Mono>
          </div>

          <label className="flex items-start gap-3 py-3 cursor-pointer border-t border-ink/15">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="h-5 w-5 mt-0.5 shrink-0 accent-ink"
            />
            <span className="text-sm text-ink-soft leading-snug">
              I&apos;m 18 or older and I agree to Partaz&apos;s{' '}
              <Link href="/terms" target="_blank" className="text-ink underline">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" className="text-ink underline">Privacy Policy</Link>.
            </span>
          </label>

          {error && <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>}
          {info && <p className="font-italic italic text-sm text-ink mt-3">{info}</p>}
          {progress && <div className="mt-3"><ProgressBanner message={progress} /></div>}

          <button className="btn-primary w-full mt-8 flex justify-between items-center" disabled={busy}>
            <span>{busy ? 'Setting up…' : <>Make a <Italic>shelf</Italic></>}</span>
            <span aria-hidden>→</span>
          </button>
        </form>

        <div className="mt-6 text-center">
          <Mono className="text-ink-soft">
            Already here?{' '}
            <Link href="/login" className="text-ink underline">Sign in</Link>
          </Mono>
        </div>
      </div>
    </main>
  );
}
