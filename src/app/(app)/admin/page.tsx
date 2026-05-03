import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { ReportRow, ReopenButton } from './ReportRow';
import { timeAgo } from '@/lib/utils';
import type { Report, Profile, Item, Message } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!isAdmin(user.email)) notFound();

  const status = searchParams.status === 'all' ? null : (searchParams.status || 'open');

  let query = supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(100);
  if (status) query = query.eq('status', status);
  const { data: rawReports } = await query;
  const reports = (rawReports || []) as Report[];

  // Pre-fetch all the related entities so the rows can render context
  const reporterIds = Array.from(new Set(reports.map(r => r.reporter_id)));
  const profileTargets = reports.filter(r => r.target_kind === 'profile').map(r => r.target_id);
  const itemTargets    = reports.filter(r => r.target_kind === 'item').map(r => r.target_id);
  const messageTargets = reports.filter(r => r.target_kind === 'message').map(r => r.target_id);

  const allProfileIds = Array.from(new Set([...reporterIds, ...profileTargets]));

  const [
    { data: profilesRaw },
    { data: itemsRaw },
    { data: messagesRaw }
  ] = await Promise.all([
    allProfileIds.length
      ? supabase.from('profiles').select('*').in('id', allProfileIds)
      : Promise.resolve({ data: [] }),
    itemTargets.length
      ? supabase.from('items').select('*').in('id', itemTargets)
      : Promise.resolve({ data: [] }),
    messageTargets.length
      ? supabase.from('messages').select('*').in('id', messageTargets)
      : Promise.resolve({ data: [] })
  ]);

  const profiles = (profilesRaw || []) as Profile[];
  const items = (itemsRaw || []) as Item[];
  const messages = (messagesRaw || []) as Message[];

  const profileById = new Map(profiles.map(p => [p.id, p]));
  const itemById = new Map(items.map(i => [i.id, i]));
  const messageById = new Map(messages.map(m => [m.id, m]));

  return (
    <main>
      <PageHeader title="Admin" />
      <div className="px-4 max-w-3xl mx-auto pb-8">
        <div className="flex gap-2 mb-4">
          {['open', 'actioned', 'dismissed', 'all'].map(s => (
            <Link
              key={s}
              href={s === 'open' ? '/admin' : `/admin?status=${s}`}
              className={
                'font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full ' +
                ((status || 'open') === s ? 'bg-accent-400 text-white' : 'bg-cream-200 text-gray-600')
              }
            >
              {s}
            </Link>
          ))}
        </div>

        {reports.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-600">Nothing here.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {reports.map(r => (
              <li key={r.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                      {r.target_kind} report · {timeAgo(r.created_at)}
                    </div>
                    <div className="font-display text-xl mt-0.5">{r.reason}</div>
                    {r.detail && <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{r.detail}</p>}
                  </div>
                  <span className={
                    'font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ' +
                    (r.status === 'open' ? 'bg-butter-soft text-accent-900'
                      : r.status === 'actioned' ? 'bg-rose-soft text-accent-900'
                      : 'bg-cream-200 text-gray-600')
                  }>{r.status}</span>
                </div>

                <ContextBlock
                  report={r}
                  profileById={profileById}
                  itemById={itemById}
                  messageById={messageById}
                />

                <div className="text-xs text-gray-500">
                  Reported by{' '}
                  <Link href={`/u/${r.reporter_id}`} className="text-accent-600 underline">
                    {profileById.get(r.reporter_id)?.first_name || 'unknown'}
                  </Link>
                </div>

                {r.status === 'open' && (
                  <ReportRow
                    reportId={r.id}
                    targetKind={r.target_kind}
                    targetId={r.target_id}
                    targetUserId={
                      r.target_kind === 'profile' ? r.target_id
                      : r.target_kind === 'item' ? itemById.get(r.target_id)?.owner_id || null
                      : r.target_kind === 'message' ? messageById.get(r.target_id)?.sender_id || null
                      : null
                    }
                  />
                )}

                {r.status !== 'open' && (
                  <div className="border-t border-cream-200 pt-3 flex items-center justify-between gap-3 flex-wrap">
                    {r.resolution_note ? (
                      <p className="text-xs text-gray-500 italic">Note: {r.resolution_note}</p>
                    ) : <span className="text-xs text-gray-400">No note</span>}
                    <ReopenButton
                      reportId={r.id}
                      // If the action hid an item, offer to also un-hide it
                      itemToUnhideId={r.target_kind === 'item' && r.status === 'actioned' ? r.target_id : undefined}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function ContextBlock({
  report, profileById, itemById, messageById
}: {
  report: Report;
  profileById: Map<string, Profile>;
  itemById: Map<string, Item>;
  messageById: Map<string, Message>;
}) {
  if (report.target_kind === 'profile') {
    const p = profileById.get(report.target_id);
    if (!p) return <p className="text-xs text-gray-400">Profile not found.</p>;
    return (
      <Link href={`/u/${p.id}`} className="card p-3 flex items-center gap-3 hover:shadow-md transition">
        <Avatar url={p.photo_url} name={p.first_name} size={40} />
        <div className="flex-1 min-w-0">
          <div className="font-medium">{p.first_name}{p.is_banned && ' · banned'}</div>
          <div className="text-xs text-gray-500">{p.suburb} · {p.email}</div>
        </div>
      </Link>
    );
  }
  if (report.target_kind === 'item') {
    const i = itemById.get(report.target_id);
    if (!i) return <p className="text-xs text-gray-400">Item not found.</p>;
    return (
      <Link href={`/items/${i.id}`} className="card p-3 flex items-center gap-3 hover:shadow-md transition">
        <div className="w-12 h-12 rounded-xl bg-cream-200 overflow-hidden shrink-0">
          {i.photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={i.photos[0]} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium line-clamp-1">{i.title}</div>
          <div className="text-xs text-gray-500">{i.category}</div>
        </div>
      </Link>
    );
  }
  if (report.target_kind === 'message') {
    const m = messageById.get(report.target_id);
    if (!m) return <p className="text-xs text-gray-400">Message not found.</p>;
    const sender = profileById.get(m.sender_id);
    return (
      <div className="card p-3">
        <div className="text-xs text-gray-500 mb-1">From {sender?.first_name || 'unknown'} · {timeAgo(m.created_at)}</div>
        <p className="text-sm whitespace-pre-wrap">{m.body}</p>
      </div>
    );
  }
  return null;
}
