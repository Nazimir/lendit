'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOut() {
  const router = useRouter();
  async function out() {
    const sb = createClient();
    await sb.auth.signOut();
    router.replace('/login');
    router.refresh();
  }
  return (
    <button onClick={out} className="text-sm text-accent-600 font-medium">Sign out</button>
  );
}
