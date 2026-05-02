'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/Avatar';
import { Spinner } from '@/components/Spinner';
import { normalizeImage } from '@/lib/imageUpload';
import type { Profile } from '@/lib/types';

const AVATAR_SIZE = 256;
const AVATAR_QUALITY = 0.82;

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
      // 1. HEIC → JPEG if needed
      const normalized = await normalizeImage(file);

      // 2. Resize and compress in the browser via Canvas → small data URL
      const dataUrl = await resizeToDataURL(normalized, AVATAR_SIZE, AVATAR_QUALITY);

      // 3. Save the data URL straight onto the profile row. No storage bucket.
      const sb = createClient();
      const { error: updErr } = await sb.from('profiles').update({ photo_url: dataUrl }).eq('id', profile.id);
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
      {error && <p className="text-xs text-red-600 mt-1 max-w-[260px]">{error}</p>}
    </div>
  );
}

/**
 * Read a File as a base64 data URL after resizing to a square thumbnail.
 * Uses a center-crop to fit the avatar shape.
 */
async function resizeToDataURL(file: File, size: number, quality: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not read image'));
      i.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    // Center-crop the source to a square
    const sourceSize = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - sourceSize) / 2;
    const sy = (img.naturalHeight - sourceSize) / 2;
    ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, size, size);

    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
