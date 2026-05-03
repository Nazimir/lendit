'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return { ok: false as const, error: 'Not authorised.', supabase: null };
  }
  return { ok: true as const, user, supabase };
}

export async function dismissReport(reportId: string, note: string): Promise<{ ok: true } | { error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase.from('reports').update({
    status: 'dismissed',
    resolution_note: note,
    resolved_at: new Date().toISOString(),
    resolved_by: auth.user.id
  }).eq('id', reportId);
  if (error) return { error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}

export async function actionReport(reportId: string, note: string): Promise<{ ok: true } | { error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase.from('reports').update({
    status: 'actioned',
    resolution_note: note,
    resolved_at: new Date().toISOString(),
    resolved_by: auth.user.id
  }).eq('id', reportId);
  if (error) return { error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}

export async function banUser(userId: string, reason: string): Promise<{ ok: true } | { error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase.from('profiles').update({
    is_banned: true,
    banned_at: new Date().toISOString(),
    banned_reason: reason
  }).eq('id', userId);
  if (error) return { error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}

export async function unbanUser(userId: string): Promise<{ ok: true } | { error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase.from('profiles').update({
    is_banned: false,
    banned_at: null,
    banned_reason: null
  }).eq('id', userId);
  if (error) return { error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}

export async function hideItem(itemId: string): Promise<{ ok: true } | { error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  // "Hide" by marking unavailable. Hard-deletion would lose history.
  const { error } = await auth.supabase.from('items').update({ is_available: false }).eq('id', itemId);
  if (error) return { error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}

export async function deleteMessage(messageId: string): Promise<{ ok: true } | { error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase.from('messages').delete().eq('id', messageId);
  if (error) return { error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}

export async function unhideItem(itemId: string): Promise<{ ok: true } | { error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const { error } = await auth.supabase.from('items').update({ is_available: true }).eq('id', itemId);
  if (error) return { error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}

export async function reopenReport(reportId: string, alsoUnhideItemId?: string): Promise<{ ok: true } | { error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  // Reset the report to open
  const { error } = await auth.supabase.from('reports').update({
    status: 'open',
    resolution_note: null,
    resolved_at: null,
    resolved_by: null
  }).eq('id', reportId);
  if (error) return { error: error.message };

  // If the resolution had hidden an item, restore it too
  if (alsoUnhideItemId) {
    await auth.supabase.from('items').update({ is_available: true }).eq('id', alsoUnhideItemId);
  }

  revalidatePath('/admin');
  return { ok: true };
}
