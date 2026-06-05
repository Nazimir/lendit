'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TagInput } from '@/components/TagInput';
import { Mono } from '@/components/typography';

/**
 * Minimal inline tag editor for an existing item. No save button — each
 * change auto-persists. Chips update optimistically; on failure the UI
 * reverts and shows a small error line.
 *
 * Deliberately quiet: a small label, the chips, the input. Doesn't claim
 * primary attention on the listing page.
 */
export function TagEditor({ itemId, initialTags }: { itemId: string; initialTags: string[] }) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [error, setError] = useState<string | null>(null);

  async function save(next: string[]) {
    const prev = tags;
    setTags(next); // optimistic
    setError(null);
    const sb = createClient();
    const { error } = await sb.from('items').update({ tags: next }).eq('id', itemId);
    if (error) {
      setTags(prev);
      setError(error.message);
      return;
    }
    // Refresh server-rendered tag filter strips elsewhere on the app.
    router.refresh();
  }

  return (
    <div>
      <Mono className="text-ink-soft block mb-2">§ — Tags</Mono>
      <TagInput value={tags} onChange={save} placeholder="Add a tag…" />
      {error && <p className="font-italic italic text-sm text-cat-tools mt-2">{error}</p>}
    </div>
  );
}
