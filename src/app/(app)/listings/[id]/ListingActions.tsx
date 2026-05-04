'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Item } from '@/lib/types';

export function ListingActions({ item }: { item: Item }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleAvailable() {
    setBusy(true);
    const sb = createClient();
    await sb.from('items').update({ is_available: !item.is_available }).eq('id', item.id);
    router.refresh();
    setBusy(false);
  }

  async function toggleVisibility() {
    const next = item.visibility === 'public' ? 'private' : 'public';
    setBusy(true);
    const sb = createClient();
    await sb.from('items').update({ visibility: next }).eq('id', item.id);
    router.refresh();
    setBusy(false);
  }

  async function remove() {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    setBusy(true);
    const sb = createClient();
    const { error } = await sb.from('items').delete().eq('id', item.id);
    setBusy(false);
    if (error) { alert(error.message); return; }
    router.replace('/listings');
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button onClick={toggleAvailable} disabled={busy} className="btn-secondary flex-1">
          {item.is_available ? 'Mark unavailable' : 'Mark available'}
        </button>
        <button onClick={remove} disabled={busy} className="btn-danger">
          Delete
        </button>
      </div>
      <button onClick={toggleVisibility} disabled={busy} className="btn-secondary w-full">
        {item.visibility === 'public' ? 'Make private (only you can see)' : 'Make public (show in search & feed)'}
      </button>
    </div>
  );
}
