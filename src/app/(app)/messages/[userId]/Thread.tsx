'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Message } from '@/lib/types';

export function Thread({
  meId, otherId, initialMessages
}: { meId: string; otherId: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
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
      }, payload => {
        const m = payload.new as Message;
        const isPair =
          (m.sender_id === meId && m.recipient_id === otherId) ||
          (m.sender_id === otherId && m.recipient_id === meId);
        if (!isPair) return;
        setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
      })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [meId, otherId]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const sb = createClient();
    const { error } = await sb.from('messages').insert({
      sender_id: meId, recipient_id: otherId, body: body.trim()
    });
    setBusy(false);
    if (error) { alert(error.message); return; }
    setBody('');
  }

  return (
    <div className="card flex flex-col" style={{ height: 'calc(100vh - 240px)' }}>
      <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Say hi.</p>
        ) : (
          messages.map(m => {
            const mine = m.sender_id === meId;
            return (
              <div key={m.id} className={'flex ' + (mine ? 'justify-end' : 'justify-start')}>
                <div className={'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ' +
                  (mine ? 'bg-accent-400 text-white rounded-br-md' : 'bg-cream-200 text-accent-900 rounded-bl-md')
                }>
                  {m.body}
                </div>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={send} className="p-3 border-t border-cream-200 flex gap-2">
        <input
          className="input flex-1 py-2.5"
          placeholder="Message…"
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={1000}
        />
        <button className="btn-primary py-2.5 px-4" disabled={busy || !body.trim()}>Send</button>
      </form>
    </div>
  );
}
