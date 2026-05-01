'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { normalizeImage } from '@/lib/imageUpload';

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [suburb, setSuburb] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, suburb, phone },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) { setError(error.message); setBusy(false); return; }

    // If a photo was supplied and we have an active session, upload it now.
    // HEIC files (iPhone defaults) are auto-converted to JPEG.
    const userId = data.user?.id;
    if (userId && photoFile) {
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

    if (data.session) {
      router.replace('/home');
      router.refresh();
    } else {
      setInfo("Check your email for a confirmation link, then sign in.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-block w-12 h-12 rounded-2xl bg-accent-400 mb-3" />
          <h1 className="text-2xl font-semibold">Join LendIt</h1>
          <p className="text-gray-500 text-sm mt-1">Borrow stuff from your neighbours</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">First name</label>
            <input className="input" required value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="label">Suburb / town</label>
            <input className="input" required placeholder="e.g. Bondi" value={suburb} onChange={e => setSuburb(e.target.value)} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" type="tel" placeholder="+61 …" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">Profile photo (optional)</label>
            <input className="input" type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} />
            <p className="text-xs text-gray-500 mt-1">8+ characters.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-accent-700">{info}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account? <Link href="/login" className="text-accent-600 font-medium">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
