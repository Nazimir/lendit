import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { SafetyMenu } from '@/components/SafetyMenu';
import { Thread } from './Thread';
import { paletteForCategory } from '@/lib/categoryStyle';
import { territoryForProfile } from '@/lib/personalTerritory';
import type { Profile, Message, Item } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ConversationPage({ params }: { params: { userId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (user.id === params.userId) redirect('/messages');

  const [{ data: other }, { data: me }, { data: msgs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', params.userId).single(),
    supabase.from('profiles').select('id, territory_override').eq('id', user.id).single(),
    supabase.from('messages').select('*')
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${params.userId}),` +
        `and(sender_id.eq.${params.userId},recipient_id.eq.${user.id})`
      )
      .order('created_at')
  ]);

  if (!other) notFound();

  // My bubble colour = my personal territory (whatever I last shuffled to).
  const myPalette = paletteForCategory(
    territoryForProfile(me as { id: string; territory_override: string | null })
  );

  // Pre-fetch any items referenced via context_item_id so the thread can
  // render reply-style preview cards.
  const messages = (msgs || []) as Message[];
  const itemIds = Array.from(new Set(messages.map(m => m.context_item_id).filter(Boolean) as string[]));
  let items: Item[] = [];
  if (itemIds.length > 0) {
    const { data } = await supabase.from('items').select('*').in('id', itemIds);
    items = (data || []) as Item[];
  }

  return (
    <main>
      <PageHeader
        title={(other as Profile).first_name}
        back="/messages"
        action={
          <div className="flex items-center gap-1">
            <Link href={`/u/${params.userId}`} className="text-sm text-accent-600 font-medium">Profile</Link>
            <SafetyMenu
              targetKind="profile"
              targetId={params.userId}
              blockableUserId={params.userId}
              context="this user"
            />
          </div>
        }
      />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        <Link href={`/u/${params.userId}`} className="card p-3 flex gap-3 items-center mb-4 hover:shadow-md transition">
          <Avatar url={(other as Profile).photo_url} name={(other as Profile).first_name} size={40} />
          <div className="min-w-0 flex-1">
            <div className="font-medium">{(other as Profile).first_name}</div>
            <div className="text-xs text-gray-500">{(other as Profile).suburb}</div>
          </div>
        </Link>
        <Thread
          meId={user.id}
          otherId={params.userId}
          initialMessages={messages}
          contextItems={items}
          myBubbleBg={myPalette.bg}
          myBubbleColor={myPalette.ink}
        />
      </div>
    </main>
  );
}
