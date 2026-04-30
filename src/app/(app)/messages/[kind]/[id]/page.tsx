import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { Thread } from './Thread';
import type { ThreadKind, Profile, Item } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MessageThreadPage({ params }: { params: { kind: string; id: string } }) {
  if (params.kind !== 'request' && params.kind !== 'loan') notFound();
  const kind = params.kind as ThreadKind;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Look up parent for participation check + header info
  const parentTable = kind === 'request' ? 'borrow_requests' : 'loans';
  const { data: parent } = await supabase.from(parentTable).select('*').eq('id', params.id).single();
  if (!parent) notFound();
  if (![parent.borrower_id, parent.lender_id].includes(user.id)) redirect('/messages');

  const otherId = parent.borrower_id === user.id ? parent.lender_id : parent.borrower_id;
  const [{ data: other }, { data: item }, { data: msgs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', otherId).single(),
    supabase.from('items').select('*').eq('id', parent.item_id).single(),
    supabase.from('messages').select('*').eq('thread_kind', kind).eq('thread_id', params.id).order('created_at')
  ]);

  return (
    <main>
      <PageHeader
        title={(other as Profile)?.first_name || 'Thread'}
        back="/messages"
        action={
          <Link
            href={kind === 'loan' ? `/loans/${params.id}` : `/items/${parent.item_id}`}
            className="text-sm text-accent-600 font-medium"
          >
            {kind === 'loan' ? 'Loan' : 'Item'}
          </Link>
        }
      />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        <div className="card p-3 flex gap-3 items-center mb-4">
          <Avatar url={(other as Profile)?.photo_url} name={(other as Profile)?.first_name || '?'} size={40} />
          <div className="min-w-0 flex-1">
            <div className="font-medium">{(other as Profile)?.first_name}</div>
            <div className="text-xs text-gray-500 truncate">About: {(item as Item)?.title}</div>
          </div>
        </div>
        <Thread
          kind={kind}
          threadId={params.id}
          meId={user.id}
          initialMessages={msgs || []}
        />
      </div>
    </main>
  );
}
