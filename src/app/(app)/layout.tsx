import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/BottomNav';
import { Footer } from '@/components/Footer';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

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
