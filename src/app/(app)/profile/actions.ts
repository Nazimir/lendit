'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function uploadAvatar(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: 'Not signed in. Please refresh the page and try again.' };

  const file = formData.get('avatar');
  if (!(file instanceof File)) return { error: 'No file received.' };

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  // We piggy-back on the item-photos bucket for avatars too — the
  // profile-photos bucket has a quirky configuration in this project that
  // rejects uploads. The item-photos bucket has the same {user_id}/...
  // RLS pattern and works reliably.
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from('item-photos')
    .upload(path, buffer, {
      upsert: true,
      contentType: file.type || 'image/jpeg'
    });
  if (upErr) return { error: 'Storage step: ' + upErr.message };

  const { data: pub } = supabase.storage.from('item-photos').getPublicUrl(path);

  const { error: updErr } = await supabase
    .from('profiles')
    .update({ photo_url: pub.publicUrl })
    .eq('id', user.id);
  if (updErr) return { error: 'Profile step: ' + updErr.message };

  revalidatePath('/profile');
  revalidatePath(`/u/${user.id}`);
  return { ok: true };
}

/**
 * Soft-delete the current user's account.
 *  - Refuses if any active loans (lender or borrower side) are open.
 *  - Anonymises the profile (first_name → "Deleted user", clears photo,
 *    suburb, phone, email reference) so historical loans, reviews, and
 *    chats with other users keep their integrity.
 *  - Hard-deletes messages where the user is sender or recipient (chat
 *    privacy — the other person no longer sees the conversation either).
 *  - Hard-deletes the user's items (cascade clears their photos table refs).
 *  - Signs the user out.
 *
 * Note: this does NOT delete the underlying auth.users row, which means a
 * user could in theory log back in with their original credentials. Doing a
 * true account purge requires the Supabase service_role key (via
 * supabase.auth.admin.deleteUser), which we do not currently have wired
 * into Vercel env vars. See PHASE-A notes.
 */
export async function deleteMyAccount(): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  // 1. Refuse if there are open loans (either side).
  const { data: openLoans } = await supabase
    .from('loans')
    .select('id')
    .or(`borrower_id.eq.${user.id},lender_id.eq.${user.id}`)
    .neq('status', 'completed');
  if (openLoans && openLoans.length > 0) {
    return { error: `You have ${openLoans.length} open loan(s). Please complete or close them before deleting your account.` };
  }

  // 2. Hard-delete messages (both directions).
  await supabase
    .from('messages')
    .delete()
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

  // 3. Hard-delete the user's items (cascades to borrow_requests for those items).
  await supabase.from('items').delete().eq('owner_id', user.id);

  // 4. Anonymise the profile but keep the row alive for completed-loan FKs.
  const { error: profErr } = await supabase
    .from('profiles')
    .update({
      first_name: 'Deleted user',
      photo_url: null,
      suburb: '',
      phone: null,
      is_deleted: true,
      deleted_at: new Date().toISOString()
    })
    .eq('id', user.id);
  if (profErr) return { error: 'Could not anonymise profile: ' + profErr.message };

  // 5. Sign out (clears the cookie session).
  await supabase.auth.signOut();

  return { ok: true };
}
