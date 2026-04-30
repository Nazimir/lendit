import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { timeAgo } from '@/lib/utils';
import type { BorrowRequest, Loan, Item, Profile, Message } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: reqs }, { data: lns }] = await Promise.all([
    supabase.from('borrow_requests').select('*')
      .or(`borrower_id.eq.${user.id},lender_id.eq.${user.id}`)
      .order('updated_at', { ascending: false }),
    supabase.from('loans').select('*')
      .or(`borrower_id.eq.${user.id},lender_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })
  ]);

  const requests = (reqs || []) as BorrowRequest[];
  const loans = (lns || []) as Loan[];

  // Drop request threads if a loan exists for the same request
  const reqIdsWithLoan = new Set(loans.map(l => l.request_id).filter(Boolean));
  const filteredRequests = requests.filter(r => !reqIdsWithLoan.has(r.id));

  // Collect related items + profiles
  const itemIds = Array.from(new Set([...filteredRequests.map(r => r.item_id), ...loans.map(l => l.item_id)]));
  const otherIds = Array.from(new Set([
    ...filteredRequests.map(r => r.borrower_id === user.id ? r.lender_id : r.borrower_id),
    ...loans.map(l => l.borrower_id === user.id ? l.lender_id : l.borrower_id)
  ]));

  let items: Item[] = [];
  let profs: Profile[] = [];
  if (itemIds.length > 0) {
    const { data } = await supabase.from('items').select('*').in('id', itemIds);
    items = (data || []) as Item[];
  }
  if (otherIds.length > 0) {
    const { data } = await supabase.from('profiles').select('*').in('id', otherIds);
    profs = (data || []) as Profile[];
  }

  const itemMap = new Map(items.map(i => [i.id, i]));
  const profMap = new Map(profs.map(p => [p.id, p]));

  // Last message per thread for preview
  const allThreads = [
    ...filteredRequests.map(r => ({ kind: 'request' as const, id: r.id, otherId: r.borrower_id === user.id ? r.lender_id : r.borrower_id, itemId: r.item_id, ts: r.updated_at })),
    ...loans.map(l => ({ kind: 'loan' as const, id: l.id, otherId: l.borrower_id === user.id ? l.lender_id : l.borrower_id, itemId: l.item_id, ts: l.updated_at }))
  ].sort((a, b) => +new Date(b.ts) - +new Date(a.ts));

  let lastMsgMap = new Map<string, Message>();
  if (allThreads.length > 0) {
    const { data: msgs } = await supabase
      .from('messages').select('*')
      .in('thread_id', allThreads.map(t => t.id))
      .order('created_at', { ascending: false }).limit(200);
    for (const m of (msgs || []) as Message[]) {
      const key = `${m.thread_kind}:${m.thread_id}`;
      if (!lastMsgMap.has(key)) lastMsgMap.set(key, m);
    }
  }

  return (
    <main>
      <PageHeader title="Messages" />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        {allThreads.length === 0 ? (
          <div className="card p-8 text-center mt-6">
            <p className="text-gray-600">No messages yet.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {allThreads.map(t => {
              const item = itemMap.get(t.itemId);
              const other = profMap.get(t.otherId);
              const last = lastMsgMap.get(`${t.kind}:${t.id}`);
              return (
                <li key={`${t.kind}-${t.id}`}>
                  <Link href={`/messages/${t.kind}/${t.id}`} className="card p-3 flex items-center gap-3 hover:shadow-md transition">
                    <Avatar url={other?.photo_url || null} name={other?.first_name || '?'} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate">{other?.first_name || 'User'}</div>
                        {last && <div className="text-[11px] text-gray-500 shrink-0 ml-2">{timeAgo(last.created_at)}</div>}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                        {item?.title || 'Item'} {t.kind === 'loan' ? '· Loan' : '· Request'}
                      </div>
                      {last && <div className="text-sm text-gray-700 line-clamp-1 mt-1">{last.body}</div>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
