'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Message, Item } from '@/lib/types';

export function Thread({
  meId, otherId, initialMessages, contextItems
}: {
  meId: string;
  otherId: string;
  initialMessages: Message[];
  contextItems: Item[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [items, setItems] = useState<Map<string, Item>>(
    () => new Map(contextItems.map(i => [i.id, i]))
  );
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Realtime: listen for new messages where I'm a participant of this pair
  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel(`pair-${[meId, otherId].sort().join('-')}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, async payload => {
        const m = payload.new as Message;
        const isPair =
          (m.sender_id === meId && m.recipient_id === otherId) ||
          (m.sender_id === otherId && m.recipient_id === meId);
        if (!isPair) return;
        setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
        // Lazily fetch any new context item we don't yet have
        if (m.context_item_id && !items.has(m.context_item_id)) {
          const { data } = await sb.from('items').select('*').eq('id', m.context_item_id).single();
          if (data) setItems(prev => new Map(prev).set(data.id, data as Item));
        }
      })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [meId, otherId, items]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true); setSendError(null);
    const sb = createClient();
    const { error } = await sb.from('messages').insert({
      sender_id: meId, recipient_id: otherId, body: body.trim()
    });
    setBusy(false);
    if (error) {
      // Translate the raw RLS error into something a person can read.
      const raw = error.message.toLowerCase();
      if (raw.includes('row-level security') || raw.includes('row level security')) {
        setSendError("This message can't be delivered. One of you may have blocked the other.");
      } else {
        setSendError("Couldn't send your message. Please try again.");
      }
      return;
    }
    setBody('');
  }

  // Pre-compute day-separator positions
  const grouped = useMemo(() => groupByDay(messages), [messages]);

  return (
    <div className="card flex flex-col" style={{ height: 'calc(100vh - 240px)' }}>
      <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Say hi.</p>
        ) : (
          grouped.map(group => (
            <div key={group.key} className="space-y-2">
              <DaySeparator label={group.label} />
              {group.messages.map(m => {
                const mine = m.sender_id === meId;
                const ctx = m.context_item_id ? items.get(m.context_item_id) : null;
                return (
                  <div key={m.id} className={'flex flex-col ' + (mine ? 'items-end' : 'items-start')}>
                    <div className={'max-w-[80%] rounded-2xl px-1 py-1 text-sm ' +
                      (mine ? 'bg-accent-400 text-white rounded-br-md' : 'bg-cream-200 text-accent-900 rounded-bl-md')
                    }>
                      {ctx && <ContextCard item={ctx} mine={mine} />}
                      <div className="px-2.5 py-1.5 whitespace-pre-wrap">{m.body}</div>
                    </div>
                    <span className={'text-[10px] mt-0.5 ' + (mine ? 'text-gray-400 mr-1' : 'text-gray-400 ml-1')}>
                      {timeOnly(m.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
      <form onSubmit={send} className="p-3 border-t border-cream-200 flex flex-col gap-2">
        {sendError && (
          <div className="bg-rose-soft text-accent-900 text-xs rounded-xl px-3 py-2">
            {sendError}
          </div>
        )}
        <div className="flex gap-2">
          <input
            className="input flex-1 py-2.5"
            placeholder="Message…"
            value={body}
            onChange={e => { setBody(e.target.value); if (sendError) setSendError(null); }}
            maxLength={1000}
          />
          <button className="btn-primary py-2.5 px-4" disabled={busy || !body.trim()}>Send</button>
        </div>
      </form>
    </div>
  );
}

function ContextCard({ item, mine }: { item: Item; mine: boolean }) {
  return (
    <Link
      href={`/items/${item.id}`}
      className={
        'flex items-center gap-2 m-1 rounded-xl pl-2 pr-3 py-1.5 border-l-4 ' +
        (mine
          ? 'bg-white/10 border-white/60 text-white/90 hover:bg-white/15'
          : 'bg-white border-accent-400 text-accent-900 hover:bg-cream-50')
      }
    >
      <div className="w-9 h-9 rounded-lg overflow-hidden bg-cream-200 shrink-0">
        {item.photos?.[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={'text-[11px] font-medium uppercase tracking-wide ' + (mine ? 'opacity-80' : 'text-accent-600')}>
          About this listing
        </div>
        <div className="text-xs font-medium line-clamp-1">{item.title}</div>
      </div>
    </Link>
  );
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center my-3">
      <span className="text-[11px] font-medium px-3 py-0.5 rounded-full bg-cream-200 text-gray-500 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

function groupByDay(messages: Message[]) {
  const groups: { key: string; label: string; messages: Message[] }[] = [];
  for (const m of messages) {
    const d = new Date(m.created_at);
    const key = d.toISOString().slice(0, 10);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: dayLabel(d), messages: [] };
      groups.push(group);
    }
    group.messages.push(m);
  }
  return groups;
}

function dayLabel(d: Date) {
  const today = new Date();
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  if (fmt(d) === fmt(today)) return 'Today';
  if (fmt(d) === fmt(yest)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
