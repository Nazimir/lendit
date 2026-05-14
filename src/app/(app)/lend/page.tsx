import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Wordmark } from '@/components/Wordmark';
import { Mono } from '@/components/typography';
import { VerifyGate } from '@/components/VerifyGate';
import { REQUIRE_PHONE_VERIFICATION } from '@/lib/featureFlags';
import { LendForm } from './LendForm';

export const dynamic = 'force-dynamic';

export default async function LendInPersonPage({
  searchParams
}: {
  searchParams: { item?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (REQUIRE_PHONE_VERIFICATION) {
    const { data: me } = await supabase.from('profiles').select('phone_verified').eq('id', user.id).single();
    if (!me?.phone_verified) {
      const next = searchParams.item ? `/lend?item=${searchParams.item}` : '/lend';
      return (
        <main className="min-h-screen bg-paper px-6 py-10 flex flex-col">
          <div className="w-full max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-10">
              <Wordmark size={22} />
              <div className="flex items-center gap-3">
                <Link href="/listings" className="text-ink-soft hover:text-ink">
                  <Mono>← Shelf</Mono>
                </Link>
                <Mono className="text-ink-soft">Hand-off</Mono>
              </div>
            </div>
            <VerifyGate action="lend an item to someone" next={next} />
          </div>
        </main>
      );
    }
  }

  return <LendForm />;
}
