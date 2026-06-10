import { redirect } from 'next/navigation';

/**
 * /home is treated as "the app's landing page," which is now /loans
 * (the Sharing view). Old bookmarks and cached share links land here.
 *
 * If someone specifically wanted the feed they'll navigate from the
 * bottom nav, so this stub forwards to the Sharing tab — the actual
 * post-sign-in entry point.
 *
 * If this stub ever stops getting hits in production logs, it's safe
 * to delete.
 */
export default function HomeRedirect() {
  redirect('/loans');
}
