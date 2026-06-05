'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { TagFilterStrip } from './TagInput';

/**
 * URL-bound wrapper around <TagFilterStrip>. Selecting a chip updates the
 * `?tag=…` query param so the server component above can filter and the
 * URL is shareable. Selecting the same chip again (or "All") clears it.
 */
export function TagFilterURL({ tags }: { tags: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const selected = search.get('tag');

  function pick(tag: string | null) {
    const params = new URLSearchParams(search.toString());
    if (tag === null) params.delete('tag');
    else              params.set('tag', tag);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return <TagFilterStrip tags={tags} selected={selected} onSelect={pick} />;
}
