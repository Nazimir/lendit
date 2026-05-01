import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Legacy route — redirects /messages/request/[id] and /messages/loan/[id]
// to the unified /messages/[user_id] thread.
export default async function LegacyThreadRedirect({ params }: { params: { kind: string; id: string } }) {
  if (params.kind !== 'request' && params.kind !== 'loan') notFound();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const table = params.kind === 'request' ? 'borrow_requests' : 'loans';
  const { data: parent } = await supabase.from(table).select('borrower_id,lender_id').eq('id', params.id).single();
  if (!parent) redirect('/messages');

  const otherId = parent.borrower_id === user.id ? parent.lender_id : parent.borrower_id;
  redirect(`/messages/${otherId}`);
}
