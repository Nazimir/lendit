import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { Stars } from '@/components/Stars';
import { RequestForm } from './RequestForm';
import { dateLabel } from '@/lib/utils';
import type { Item, Profile, BorrowRequest } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: item } = await supabase.from('items').select('*').eq('id', params.id).single();
  if (!item) notFound();

  // If you're the owner, send to the owner-side page
  if ((item as Item).owner_id === user.id) redirect(`/listings/${params.id}`);

  const { data: owner } = await supabase.from('profiles').select('*').eq('id', (item as Item).owner_id).single();

  // Existing pending request from me?
  const { data: mine } = await supabase
    .from('borrow_requests')
    .select('*')
    .eq('item_id', params.id).eq('borrower_id', user.id)
    .order('created_at', { ascending: false }).limit(1);

  const existing = (mine?.[0] || null) as BorrowRequest | null;

  return (
    <main>
      <PageHeader title="Item" back="/home" />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        {item.photos[0] && (
          <div className="card overflow-hidden mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.photos[0]} alt="" className="w-full aspect-[4/3] object-cover" />
          </div>
        )}
        {item.photos.length > 1 && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {item.photos.slice(1).map((p: string, i: number) => (
              <div key={i} className="card overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="w-full aspect-square object-cover" />
              </div>
            ))}
          </div>
        )}

        <h2 className="text-xl font-semibold">{item.title}</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="pill-muted">{item.category}</span>
          <span className="pill-muted">Up to {item.max_loan_days}d</span>
          {item.extensions_allowed && <span className="pill-accent">Extensions OK</span>}
          {!item.is_available && <span className="pill-rose">On loan</span>}
        </div>

        {!item.is_available && item.expected_back_at && (
          <div className="card p-3 mt-3 flex items-center gap-3 bg-cream-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#577559" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <div className="text-sm">
              <span className="text-gray-600">Expected back </span>
              <span className="font-medium">{dateLabel(item.expected_back_at)}</span>
              {owner && (
                <>
                  {' · '}
                  <Link href={`/messages/${owner.id}`} className="text-accent-700 font-medium hover:underline">
                    Message {owner.first_name}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        <p className="text-gray-700 mt-4 whitespace-pre-wrap">{item.description}</p>

        {owner && (
          <Link href={`/u/${owner.id}`} className="card p-3 flex items-center gap-3 mt-5 hover:shadow-md transition">
            <Avatar url={owner.photo_url} name={owner.first_name} size={44} />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{owner.first_name}</div>
              <div className="text-xs text-gray-500">{owner.suburb}</div>
            </div>
            <div className="text-right">
              <Stars value={(owner as Profile).reputation_score} />
              <div className="text-xs text-gray-500 mt-0.5">{(owner as Profile).reputation_score.toFixed(1)}</div>
            </div>
          </Link>
        )}

        <div className="mt-6">
          <RequestForm itemId={item.id} ownerId={(item as Item).owner_id} existing={existing} available={item.is_available} />
        </div>
      </div>
    </main>
  );
}
