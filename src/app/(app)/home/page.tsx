import { redirect } from 'next/navigation';

/**
 * /home was renamed to /discover when /loans became the primary landing
 * surface. Anything still pointing at /home (old bookmarks, cached share
 * links, external referrers) gets a 307 redirect to the new path.
 *
 * If this stub ever stops getting hits in production logs, it's safe to
 * delete.
 */
export default function HomeRedirect() {
  redirect('/discover');
}
