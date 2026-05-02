'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ReportTargetKind } from '@/lib/types';

export async function blockUser(blockedId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  if (user.id === blockedId) return { error: "You can't block yourself." };

  const { error } = await supabase.from('blocks').insert({
    blocker_id: user.id,
    blocked_id: blockedId
  });
  // Ignore unique-violation: it just means already blocked
  if (error && !error.message.toLowerCase().includes('duplicate')) {
    return { error: error.message };
  }

  revalidatePath('/messages');
  revalidatePath(`/u/${blockedId}`);
  return { ok: true };
}

export async function unblockUser(blockedId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { error } = await supabase.from('blocks').delete()
    .eq('blocker_id', user.id).eq('blocked_id', blockedId);
  if (error) return { error: error.message };

  revalidatePath('/messages');
  revalidatePath(`/u/${blockedId}`);
  return { ok: true };
}

export async function fileReport(args: {
  target_kind: ReportTargetKind;
  target_id: string;
  reason: string;
  detail: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  if (!args.reason.trim()) return { error: 'Pick a reason.' };

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_kind: args.target_kind,
    target_id: args.target_id,
    reason: args.reason.trim(),
    detail: args.detail.trim()
  });
  if (error) return { error: error.message };

  return { ok: true };
}
