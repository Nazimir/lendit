'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { shuffleMyTerritory } from './territoryActions';

/**
 * Discrete mono-caps button rendered in the profile masthead. Clicking it
 * rolls a new colour for the user's personal territory. Keep clicking to
 * cycle through until you like one.
 */
export function ShuffleColourButton({ color }: { color: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    start(async () => {
      const result = await shuffleMyTerritory();
      if ('error' in result) {
        // eslint-disable-next-line no-alert
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="font-mono text-[10px] uppercase tracking-mono hover:opacity-70 transition disabled:opacity-50"
      style={{ color }}
      aria-label="Shuffle my colour"
    >
      {pending ? 'Shuffling…' : '· Shuffle ↻'}
    </button>
  );
}
