'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { normalizeImage } from '@/lib/imageUpload';
import { ProgressBanner } from '@/components/Spinner';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';
import { PasswordInput } from '@/components/PasswordInput';

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [suburb, setSuburb] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, suburb, phone },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) { setError(error.message); setBusy(false); setProgress(null); return; }

    const userId = data.user?.id;
    if (userId && photoFile) {
      const isHeic = /\.hei[cf]$/i.test(photoFile.name) || /heic|heif/i.test(photoFile.type);
      setProgress(isHeic ? 'Converting & uploading photo…' : 'Uploading profile photo…');
      let normalized: File;
      try { normalized = await normalizeImage(photoFile); }
      catch { normalized = photoFile; }
      const ext = (normalized.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('profile-photos')
        .upload(path, normalized, { upsert: true });
      if (!upErr) {
        const { data: pub } = supabase.storage.from('profile-photos').getPublicUrl(path);
        await supabase.from('profiles').update({ photo_url: pub.publicUrl }).eq('id', userId);
      }
    }

    if (userId) {
      await supabase
        .from('profiles')
        .update({
          tos_accepted_at: new Date().toISOString(),
          is_adult_attested: true
        })
        .eq('id', userId);
    }

    if (data.session) {
      router.replace('/home');
      router.refresh();
    } else {
      setInfo("Check your email for a confirmation link, then sign in.");
      setBusy(false);
      setProgress(null);
    }
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

        <form onSubmit={onSubmit} className="mt-10">
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
            <label className="label">Profile photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={e => setPhotoFile(e.target.files?.[0] ?? null)}
              className="input"
            />
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
