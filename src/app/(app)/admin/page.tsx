import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic, Rule } from '@/components/typography';
import { Avatar } from '@/components/Avatar';
import { ReportRow, ReopenButton } from './ReportRow';
import { timeAgo } from '@/lib/utils';
import type { Report, Profile, Item, Message } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUSES: { key: string; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'actioned', label: 'Actioned' },
  { key: 'dismissed', label: 'Dismissed' },
  { key: 'all', label: 'All' }
];

export default async function AdminPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!isAdmin(user.email)) notFound();

  const status = searchParams.status === 'all' ? null : (searchParams.status || 'open');
  const activeStatus = status || 'open';

  let query = supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(100);
  if (status) query = query.eq('status', status);
  const { data: rawReports } = await query;
  const reports = (rawReports || []) as Report[];

  // Pre-fetch related entities so rows can render context
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
    <main className="min-h-screen bg-paper px-6 py-10 flex flex-col">
      <div className="w-full max-w-3xl mx-auto">
        {/* Masthead */}
        <div className="flex justify-between items-center mb-10">
          <Wordmark size={22} />
          <Mono className="text-ink-soft">Admin · Reports</Mono>
        </div>

        {/* Headline */}
        <div>
          <h1 className="font-display font-extrabold text-[64px] leading-[0.85] tracking-[-0.045em] text-ink text-balance">
            The <Italic>desk</Italic>.
          </h1>
          <p className="font-display font-medium text-[16px] leading-[1.4] text-ink-soft mt-4 text-pretty">
            Reports from the community. Read, decide, move on.
          </p>
        </div>

        {/* Section tabs */}
        <nav className="flex gap-2 mt-8">
          <SectionTab href="/admin" active>Reports</SectionTab>
          <SectionTab href="/admin/disputes">Disputes</SectionTab>
        </nav>

        {/* Status filter */}
        <div className="flex gap-2 mt-4">
          {STATUSES.map(s => (
            <FilterChip
              key={s.key}
              href={s.key === 'open' ? '/admin' : `/admin?status=${s.key}`}
              active={activeStatus === s.key}
            >
              {s.label}
            </FilterChip>
          ))}
        </div>

        {reports.length === 0 ? (
          <div className="mt-10 border-y-[1.5px] border-ink py-8">
            <h2 className="font-display font-bold text-[24px] leading-tight tracking-[-0.02em] text-ink">
              Nothing <Italic>open</Italic>.
            </h2>
            <Mono className="text-ink-soft mt-2 block">
              When something needs a look, it shows up here.
            </Mono>
          </div>
        ) : (
          <ul className="mt-10 border-y-[1.5px] border-ink">
            {reports.map((r, idx) => {
              const num = (idx + 1).toString().padStart(2, '0');
              return (
                <li key={r.id} className="border-t border-ink/15 first:border-t-0 py-6">
                  {/* Header line */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Mono className="text-ink-soft block">
                        № {num} · {r.target_kind} report · {timeAgo(r.created_at)}
                      </Mono>
                      <h3 className="font-display font-bold text-[22px] leading-tight tracking-[-0.02em] text-ink mt-1">
                        {r.reason}
                      </h3>
                      {r.detail && (
                        <p className="text-sm text-ink-soft whitespace-pre-wrap mt-2 leading-relaxed">{r.detail}</p>
                      )}
                    </div>
                    <StatusPill status={r.status} />
                  </div>

                  {/* Context block */}
                  <div className="mt-4">
                    <ContextBlock
                      report={r}
                      profileById={profileById}
                      itemById={itemById}
                      messageById={messageById}
                    />
                  </div>

                  {/* Reporter line */}
                  <div className="mt-3">
                    <Mono className="text-ink-soft">
                      Reported by{' '}
                      <Link href={`/u/${r.reporter_id}`} className="text-ink underline">
                        {profileById.get(r.reporter_id)?.first_name || 'unknown'}
                      </Link>
                    </Mono>
                  </div>

                  {/* Actions */}
                  {r.status === 'open' ? (
                    <div className="mt-4">
                      <Rule />
                      <div className="pt-4">
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
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-ink/15 flex items-center justify-between gap-3 flex-wrap">
                      {r.resolution_note ? (
                        <p className="text-xs text-ink-soft italic font-italic">Note: {r.resolution_note}</p>
                      ) : <Mono className="text-ink-soft">No note</Mono>}
                      <ReopenButton
                        reportId={r.id}
                        itemToUnhideId={r.target_kind === 'item' && r.status === 'actioned' ? r.target_id : undefined}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function SectionTab({
  href, children, active
}: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={
        'font-mono text-[10px] uppercase tracking-mono px-3 py-1.5 rounded-full transition ' +
        (active
          ? 'bg-ink text-paper'
          : 'border border-ink/20 text-ink-soft hover:text-ink hover:border-ink/40')
      }
    >
      {children}
    </Link>
  );
}

function FilterChip({
  href, children, active
}: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={
        'font-mono text-[10px] uppercase tracking-mono px-3 py-1.5 rounded-full transition ' +
        (active
          ? 'bg-ink/10 text-ink'
          : 'text-ink-soft hover:text-ink')
      }
    >
      {children}
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const style =
    status === 'open' ? 'bg-cat-kitchen text-ink'
    : status === 'actioned' ? 'bg-cat-tools text-paper'
    : 'bg-ink/10 text-ink';
  return (
    <span className={`font-mono text-[10px] uppercase tracking-mono px-2 py-1 rounded-full shrink-0 ${style}`}>
      {status}
    </span>
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
    if (!p) return <Mono className="text-ink-soft">Profile not found.</Mono>;
    return (
      <Link href={`/u/${p.id}`} className="flex items-center gap-3 border border-ink/15 rounded-2xl p-3 hover:border-ink/40 transition">
        <Avatar url={p.photo_url} name={p.first_name} size={40} />
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-[16px] tracking-[-0.015em] text-ink">
            {p.first_name}{p.is_banned && ' · banned'}
          </div>
          <Mono className="text-ink-soft">{p.suburb} · {p.email}</Mono>
        </div>
      </Link>
    );
  }
  if (report.target_kind === 'item') {
    const i = itemById.get(report.target_id);
    if (!i) return <Mono className="text-ink-soft">Item not found.</Mono>;
    return (
      <Link href={`/items/${i.id}`} className="flex items-center gap-3 border border-ink/15 rounded-2xl p-3 hover:border-ink/40 transition">
        <div className="w-12 h-12 rounded-xl bg-paper-soft overflow-hidden shrink-0">
          {i.photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={i.photos[0]} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-[16px] tracking-[-0.015em] text-ink line-clamp-1">{i.title}</div>
          <Mono className="text-ink-soft">{i.category}</Mono>
        </div>
      </Link>
    );
  }
  if (report.target_kind === 'message') {
    const m = messageById.get(report.target_id);
    if (!m) return <Mono className="text-ink-soft">Message not found.</Mono>;
    const sender = profileById.get(m.sender_id);
    return (
      <div className="border border-ink/15 rounded-2xl p-3">
        <Mono className="text-ink-soft block mb-1">
          From {sender?.first_name || 'unknown'} · {timeAgo(m.created_at)}
        </Mono>
        <p className="text-sm whitespace-pre-wrap text-ink leading-relaxed">{m.body}</p>
      </div>
    );
  }
  return null;
}
