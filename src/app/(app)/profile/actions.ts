'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function uploadAvatar(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: 'Not signed in. Please refresh the page and try again.' };

  const file = formData.get('avatar');
  if (!(file instanceof File)) return { error: 'No file received.' };

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from('profile-photos')
    .upload(path, buffer, {
      upsert: true,
      contentType: file.type || 'image/jpeg'
    });
  if (upErr) return { error: 'Storage step: ' + upErr.message };

  const { data: pub } = supabase.storage.from('profile-photos').getPublicUrl(path);

  const { error: updErr } = await supabase
    .from('profiles')
    .update({ photo_url: pub.publicUrl })
    .eq('id', user.id);
  if (updErr) return { error: 'Profile step: ' + updErr.message };

  revalidatePath('/profile');
  revalidatePath(`/u/${user.id}`);
  return { ok: true };
}
