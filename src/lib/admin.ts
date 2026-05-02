/**
 * Admin allowlist. Add the email addresses of moderators (comma-separated)
 * to the ADMIN_EMAILS environment variable in Vercel:
 *
 *   ADMIN_EMAILS=you@example.com,co-founder@example.com
 *
 * Anyone not on the list gets a 404 from the /admin route.
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}
