'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace('/login');
        router.refresh();
      }}
      className="font-mono text-[10px] uppercase tracking-mono text-ink-soft hover:text-ink transition"
    >
      Sign out
    </button>
  );
}
