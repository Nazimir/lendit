import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { VerifyGate } from '@/components/VerifyGate';
import { REQUIRE_PHONE_VERIFICATION } from '@/lib/featureFlags';
import { NewListingForm } from './NewListingForm';

export const dynamic = 'force-dynamic';

export default async function NewListingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (REQUIRE_PHONE_VERIFICATION) {
    const { data: me } = await supabase.from('profiles').select('phone_verified').eq('id', user.id).single();
    if (!me?.phone_verified) {
      return (
        <main>
          <PageHeader title="New listing" back="/listings" />
          <div className="px-4 max-w-2xl mx-auto pb-8">
            <VerifyGate action="post a listing" next="/listings/new" />
          </div>
        </main>
      );
    }
  }

  return (
    <main>
      <PageHeader title="New listing" back="/listings" />
      <NewListingForm />
    </main>
  );
}
