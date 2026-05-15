'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Global listener for Supabase's PASSWORD_RECOVERY event.
 *
 * When a user clicks a password-reset email (sent either via /forgot or
 * from the Supabase dashboard's "Send password recovery"), Supabase JS
 * detects the access_token in the URL fragment, exchanges it for a
 * recovery session, and emits an onAuthStateChange event with the type
 * 'PASSWORD_RECOVERY'.
 *
 * This component listens for that event app-wide and routes the user
 * to /reset, where they can set a new password. Without it, the user
 * lands wherever the project's Site URL points (typically the home page
 * → /login for unauthenticated routes), with the recovery session active
 * but no UI to use it.
 *
 * Mount once, near the root of the tree.
 */
export function RecoveryRedirector() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const sb = createClient();
    const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && pathname !== '/reset') {
        router.replace('/reset');
      }
    });
    return () => subscription.unsubscribe();
  }, [pathname, router]);

  return null;
}
