import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/BottomNav';
import { Footer } from '@/components/Footer';
import { BannedScreen } from '@/components/BannedScreen';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Banned users see the banned screen instead of any of the app's pages.
  const { data: me } = await supabase
    .from('profiles')
    .select('is_banned, banned_reason')
    .eq('id', user.id).single();
  if (me?.is_banned) {
    return <BannedScreen reason={me.banned_reason} />;
  }

  return (
    <>
      <div className="pb-24 min-h-screen">
        {children}
        <Footer />
      </div>
      <BottomNav />
    </>
  );
}
