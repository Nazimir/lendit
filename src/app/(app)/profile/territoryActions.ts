'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { TERRITORIES_IN_ORDER } from '@/lib/personalTerritory';

/**
 * Shuffle the current user's personal-territory colour to a different one.
 *
 * Picks at random from the 9 territories OTHER than the current one, so
 * every click changes something. Persists the choice on the profile.
 */
export async function shuffleMyTerritory(): Promise<{ ok: true; territory: string } | { error: string }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: me } = await sb
    .from('profiles')
    .select('id, territory_override')
    .eq('id', user.id)
    .single();
  if (!me) return { error: 'Profile not found.' };

  // Resolve "current" territory by either the override or the hash default
  const currentOverride: string | null = me.territory_override ?? null;
  const hashDefault = TERRITORIES_IN_ORDER[
    parseInt(me.id.replace(/-/g, '').slice(0, 4), 16) % TERRITORIES_IN_ORDER.length
  ];
  const current = currentOverride || hashDefault;

  const options = TERRITORIES_IN_ORDER.filter(t => t !== current);
  const next = options[Math.floor(Math.random() * options.length)];

  const { error } = await sb
    .from('profiles')
    .update({ territory_override: next })
    .eq('id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/profile');
  revalidatePath(`/u/${user.id}`);
  return { ok: true, territory: next };
}
