import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { Stars } from '@/components/Stars';
import { ItemCard } from '@/components/ItemCard';
import { SafetyMenu } from '@/components/SafetyMenu';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { paletteForCategory } from '@/lib/categoryStyle';
import { dateLabel } from '@/lib/utils';
import type { Profile, Review, Item, ItemWithOwner } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: prof }, { data: reviewsRaw }, { data: itemsRaw }, { data: blockRow }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', params.id).single(),
    supabase.from('reviews').select('*').eq('reviewee_id', params.id)
      .order('created_at', { ascending: false }).limit(20),
    supabase.from('items').select('*').eq('owner_id', params.id)
      .order('created_at', { ascending: false }),
    user
      ? supabase.from('blocks').select('id')
          .eq('blocker_id', user.id).eq('blocked_id', params.id).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  if (!prof) notFound();
  const profile = prof as Profile;
  const reviews = (reviewsRaw || []) as Review[];
  const items = (itemsRaw || []) as Item[];
  const isBlocked = !!blockRow;

  const available = items.filter(i => i.is_available);
  const onLoan = items.filter(i => !i.is_available);

  // Build ItemWithOwner-shaped objects so we can reuse ItemCard
  const wrap = (i: Item): ItemWithOwner => ({
    ...i,
    owner_first_name: profile.first_name,
    owner_suburb: profile.suburb,
    owner_photo_url: profile.photo_url,
    owner_reputation: profile.reputation_score
  });

  const isMe = user?.id === params.id;

  return (
    <main>
      <PageHeader title={profile.first_name} back="/home" />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        <div className="card p-5 flex items-center gap-4">
          <Avatar url={profile.photo_url} name={profile.first_name} size={72} />
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold flex items-center gap-2">
              {profile.first_name}
              {profile.phone_verified && <VerifiedBadge size={16} />}
            </div>
            <div className="text-sm text-gray-500">{profile.suburb}</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Stars value={Number(profile.reputation_score)} />
              <span className="text-xs text-gray-600">
                {Number(profile.reputation_score).toFixed(1)}
                {' '}
                ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                {' · '}
                {profile.karma_points} karma
              </span>
            </div>
          </div>
          {!isMe && user && (
            <div className="flex items-center gap-1">
              <Link href={`/messages/${profile.id}`} className="btn-secondary text-sm py-2 px-3">Message</Link>
              <SafetyMenu
                targetKind="profile"
                targetId={profile.id}
                blockableUserId={profile.id}
                alreadyBlocked={isBlocked}
                context="this user"
              />
            </div>
          )}
        </div>

        {available.length > 0 && (
          <section className="mt-7">
            <h2 className="font-mono text-[10px] font-semibold text-gray-700 mb-3 uppercase tracking-wider">
              Available now ({available.length})
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {available.map(it => <ItemCard key={it.id} item={wrap(it)} />)}
            </div>
          </section>
        )}

        {onLoan.length > 0 && (
          <section className="mt-7">
            <h2 className="font-mono text-[10px] font-semibold text-gray-700 mb-3 uppercase tracking-wider">
              On loan ({onLoan.length})
            </h2>
            <ul className="space-y-2">
              {onLoan.map(it => {
                const palette = paletteForCategory(it.category);
                return (
                  <Link
                    key={it.id}
                    href={`/items/${it.id}`}
                    className="rounded-3xl p-3 flex gap-3 items-center border-2 shadow-soft hover:-translate-y-0.5 transition block"
                    style={{ background: palette.bg, borderColor: palette.accent, color: palette.ink }}
                  >
                    <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border" style={{ borderColor: palette.accent }}>
                      {it.photos[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.photos[0]} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-lg leading-tight line-clamp-1">{it.title}</div>
                      <div className="font-mono text-[10px] uppercase tracking-wider mt-0.5 opacity-70">
                        {it.expected_back_at ? `Back ${dateLabel(it.expected_back_at)}` : 'On loan'}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-rose-soft text-accent-900 shrink-0">
                      On loan
                    </span>
                  </Link>
                );
              })}
            </ul>
          </section>
        )}

        {available.length === 0 && onLoan.length === 0 && (
          <p className="text-gray-500 text-sm mt-7">No listings yet.</p>
        )}

        <h2 className="font-mono text-[10px] font-semibold text-gray-700 mt-7 mb-3 uppercase tracking-wider">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-sm">No reviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map(r => (
              <li key={r.id} className="card p-3">
                <Stars value={r.stars} />
                {r.comment && <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
