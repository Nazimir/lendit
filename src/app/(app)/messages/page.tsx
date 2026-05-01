import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { timeAgo } from '@/lib/utils';
import type { Message, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Pull all messages I'm part of, newest first.
  const { data: msgsRaw } = await supabase
    .from('messages').select('*')
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  const msgs = (msgsRaw || []) as Message[];

  // Reduce to one entry per other user, with the most recent message
  const lastByOther = new Map<string, Message>();
  for (const m of msgs) {
    const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
    if (!lastByOther.has(otherId)) lastByOther.set(otherId, m);
  }

  const otherIds = Array.from(lastByOther.keys());
  let profs: Profile[] = [];
  if (otherIds.length > 0) {
    const { data } = await supabase.from('profiles').select('*').in('id', otherIds);
    profs = (data || []) as Profile[];
  }
  const profMap = new Map(profs.map(p => [p.id, p]));

  const threads = otherIds.map(id => ({
    other: profMap.get(id),
    last: lastByOther.get(id)!,
    otherId: id
  })).sort((a, b) => +new Date(b.last.created_at) - +new Date(a.last.created_at));

  return (
    <main>
      <PageHeader title="Messages" />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        {threads.length === 0 ? (
          <div className="card p-8 text-center mt-6">
            <p className="text-gray-600">No messages yet.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {threads.map(t => (
              <li key={t.otherId}>
                <Link href={`/messages/${t.otherId}`} className="card p-3 flex items-center gap-3 hover:shadow-md transition">
                  <Avatar url={t.other?.photo_url || null} name={t.other?.first_name || '?'} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">{t.other?.first_name || 'User'}</div>
                      <div className="text-[11px] text-gray-500 shrink-0 ml-2">{timeAgo(t.last.created_at)}</div>
                    </div>
                    <div className="text-sm text-gray-700 line-clamp-1 mt-0.5">
                      {t.last.sender_id === user.id ? 'You: ' : ''}{t.last.body}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
