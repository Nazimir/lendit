import { redirect } from 'next/navigation';

// Legacy path. The banned screen is rendered inline by the (app) layout when
// the user's profile has is_banned = true. If a non-banned user hits this
// URL directly, send them home.
export default function BannedRedirect() {
  redirect('/home');
}
