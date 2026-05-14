import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';
import { Avatar } from '@/components/Avatar';
import { paletteForCategory } from '@/lib/categoryStyle';
import { territoryForProfile } from '@/lib/personalTerritory';
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

  const threads = otherIds
    .map(id => ({
      other: profMap.get(id),
      last: lastByOther.get(id)!,
      otherId: id
    }))
    .sort((a, b) => +new Date(b.last.created_at) - +new Date(a.last.created_at));

  return (
    <main className="min-h-screen bg-paper px-6 py-10 flex flex-col">
      <div className="w-full max-w-2xl mx-auto">
        {/* Masthead */}
        <div className="flex justify-between items-center mb-10">
          <Wordmark size={22} />
          <Mono className="text-ink-soft">
            Inbox · {threads.length === 0 ? '—' : threads.length.toString().padStart(2, '0')}
          </Mono>
        </div>

        {/* Headline */}
        <div>
          <h1 className="font-display font-extrabold text-[64px] leading-[0.85] tracking-[-0.045em] text-ink text-balance">
            The <Italic>post</Italic>.
          </h1>
          <p className="font-display font-medium text-[16px] leading-[1.4] text-ink-soft mt-4 text-pretty">
            {threads.length === 0
              ? 'Nothing yet. Conversations show up here once someone says hi.'
              : 'Hand-offs, thank-yous, and the occasional check-in.'}
          </p>
        </div>

        {threads.length === 0 ? (
          <div className="mt-10 border-y-[1.5px] border-ink py-8">
            <h2 className="font-display font-bold text-[24px] leading-tight tracking-[-0.02em] text-ink">
              No <Italic>word</Italic> yet.
            </h2>
            <Mono className="text-ink-soft mt-2 block">
              Start a thread from any listing or loan.
            </Mono>
          </div>
        ) : (
          <ul className="mt-10 border-y-[1.5px] border-ink">
            {threads.map((t, idx) => {
              const num = (idx + 1).toString().padStart(2, '0');
              const territory = t.other
                ? territoryForProfile({
                    id: t.other.id,
                    territory_override: t.other.territory_override ?? null
                  })
                : 'Tools';
              const palette = paletteForCategory(territory);
              const name = t.other?.first_name || 'User';
              const mine = t.last.sender_id === user.id;

              return (
                <li
                  key={t.otherId}
                  className="border-t border-ink/15 first:border-t-0"
                >
                  <Link
                    href={`/messages/${t.otherId}`}
                    className="flex items-stretch gap-3 py-4 group"
                  >
                    {/* Coloured strip */}
                    <div
                      className="w-[6px] rounded-full shrink-0 self-stretch"
                      style={{ background: palette.bg }}
                      aria-hidden
                    />
                    {/* № index */}
                    <div className="w-10 shrink-0 flex items-start pt-1">
                      <Mono className="text-ink-soft">№ {num}</Mono>
                    </div>
                    {/* Avatar */}
                    <div className="shrink-0">
                      <Avatar url={t.other?.photo_url || null} name={name} size={44} />
                    </div>
                    {/* Name + preview */}
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="font-display font-bold text-[18px] tracking-[-0.015em] text-ink truncate">
                          {name}
                        </div>
                        <Mono className="text-ink-soft shrink-0">{timeAgo(t.last.created_at)}</Mono>
                      </div>
                      <p className="text-[14px] text-ink-soft line-clamp-1 mt-0.5">
                        {mine && <span className="text-ink-soft/70">You: </span>}
                        {t.last.body}
                      </p>
                    </div>
                    {/* Arrow */}
                    <div className="self-center shrink-0 pl-1 text-ink-soft group-hover:text-ink transition" aria-hidden>
                      ↗
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
