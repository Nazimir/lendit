'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/Avatar';
import { Spinner } from '@/components/Spinner';
import { normalizeImage } from '@/lib/imageUpload';
import type { Profile } from '@/lib/types';

export function AvatarUploader({ profile, size = 64 }: { profile: Profile; size?: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const sb = createClient();
      const normalized = await normalizeImage(file);
      const ext = (normalized.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage.from('profile-photos').upload(path, normalized, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = sb.storage.from('profile-photos').getPublicUrl(path);
      const { error: updErr } = await sb.from('profiles').update({ photo_url: pub.publicUrl }).eq('id', profile.id);
      if (updErr) throw updErr;
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-accent-300"
        aria-label="Change photo"
      >
        <Avatar url={profile.photo_url} name={profile.first_name} size={size} />
        <span
          className="absolute -bottom-1 -right-1 bg-white rounded-full shadow-soft border border-cream-200 flex items-center justify-center"
          style={{ width: size * 0.42, height: size * 0.42 }}
        >
          {busy ? (
            <Spinner size={size * 0.22} className="text-accent-600" />
          ) : (
            <svg width={size * 0.22} height={size * 0.22} viewBox="0 0 24 24" fill="none" stroke="#577559" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
