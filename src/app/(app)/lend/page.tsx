import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { VerifyGate } from '@/components/VerifyGate';
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
  const { data: me } = await supabase.from('profiles').select('phone_verified').eq('id', user.id).single();

  if (!me?.phone_verified) {
    const next = searchParams.item ? `/lend?item=${searchParams.item}` : '/lend';
    return (
      <main>
        <PageHeader title="Lend in person" back="/listings" />
        <div className="px-4 max-w-2xl mx-auto pb-8">
          <VerifyGate action="lend an item to someone" next={next} />
        </div>
      </main>
    );
  }

  return <LendForm />;
}
