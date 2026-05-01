'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { normalizeImage } from '@/lib/imageUpload';
import type { Profile } from '@/lib/types';

export function ProfileEditor({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [suburb, setSuburb] = useState(profile?.suburb || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return <button className="btn-secondary w-full" onClick={() => setOpen(true)}>Edit profile</button>;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const sb = createClient();
    let photoUrl = profile?.photo_url;
    if (photo) {
      let normalized: File;
      try { normalized = await normalizeImage(photo); }
      catch (e: any) { setError('Could not read photo: ' + (e?.message || 'unknown error')); setBusy(false); return; }
      const ext = (normalized.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage.from('profile-photos').upload(path, normalized, { upsert: true });
      if (upErr) { setError(upErr.message); setBusy(false); return; }
      const { data: pub } = sb.storage.from('profile-photos').getPublicUrl(path);
      photoUrl = pub.publicUrl;
    }
    const { error } = await sb.from('profiles').update({
      first_name: firstName, suburb, phone, photo_url: photoUrl
    }).eq('id', profile.id);
    setBusy(false);
    if (error) { setError(error.message); return; }
    setOpen(false);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="card p-4 space-y-3">
      <div>
        <label className="label">First name</label>
        <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
      </div>
      <div>
        <label className="label">Suburb</label>
        <input className="input" value={suburb} onChange={e => setSuburb(e.target.value)} required />
      </div>
      <div>
        <label className="label">Phone</label>
        <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
      </div>
      <div>
        <label className="label">Profile photo</label>
        <input className="input" type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
        <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
