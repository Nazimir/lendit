'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Routes the user to /reset whenever a Supabase password-recovery email
 * link lands them anywhere else.
 *
 * Two layers, in order:
 *
 *   1. Synchronous URL-hash check. Supabase recovery links arrive with
 *      `#access_token=…&type=recovery` in the fragment. We look for
 *      `type=recovery` on mount and hard-navigate via
 *      `window.location.replace('/reset' + hash)` — preserving the hash
 *      so Supabase JS exchanges the token on /reset, fires
 *      PASSWORD_RECOVERY there, and the page renders the password form.
 *
 *      `router.replace` from next/navigation strips the hash, which is
 *      why we use a hard navigation here.
 *
 *   2. Event subscription fallback. For edge cases where Supabase has
 *      already consumed the hash before the synchronous check runs (e.g.
 *      another component initialised the client earlier), we also
 *      listen for the PASSWORD_RECOVERY auth event and redirect on it.
 *
 * Mount once near the root of the tree.
 */
export function RecoveryRedirector() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Synchronous hash check — works even if Supabase JS hasn't
    //    had a chance to fire its event yet.
    const hash = window.location.hash;
    if (hash.includes('type=recovery') && pathname !== '/reset') {
      window.location.replace('/reset' + hash);
      return;
    }

    // 2. Event-based fallback for cases where the hash was already
    //    consumed before we got here.
    const sb = createClient();
    const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/reset') {
        router.replace('/reset');
      }
    });
    return () => subscription.unsubscribe();
  }, [pathname, router]);

  return null;
}
