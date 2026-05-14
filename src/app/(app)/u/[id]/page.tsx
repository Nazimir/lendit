import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';
import { Avatar } from '@/components/Avatar';
import { ItemCard } from '@/components/ItemCard';
import { SafetyMenu } from '@/components/SafetyMenu';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { AwayBadge } from '@/components/AwayBadge';
import { paletteForCategory } from '@/lib/categoryStyle';
import { grainStyle } from '@/lib/grain';
import { territoryForUser } from '@/lib/personalTerritory';
import type { Profile, Review, Item, ItemWithOwner } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: prof }, { data: reviewsRaw }, { data: itemsRaw }, { data: blockRow }, { count: lentCount }, { count: borrowedCount }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', params.id).single(),
    supabase.from('reviews').select('*').eq('reviewee_id', params.id)
      .order('created_at', { ascending: false }).limit(20),
    supabase.from('items').select('*').eq('owner_id', params.id)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false }),
    user
      ? supabase.from('blocks').select('id')
          .eq('blocker_id', user.id).eq('blocked_id', params.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('loans').select('id', { count: 'exact', head: true }).eq('lender_id', params.id).eq('status', 'completed'),
    supabase.from('loans').select('id', { count: 'exact', head: true }).eq('borrower_id', params.id).eq('status', 'completed')
  ]);

  if (!prof) notFound();
  const profile = prof as Profile;
  const reviews = (reviewsRaw || []) as Review[];
  const items = (itemsRaw || []) as Item[];
  const isBlocked = !!blockRow;
  const isMe = user?.id === params.id;

  // Wrap items as ItemWithOwner so we can reuse ItemCard
  const wrap = (i: Item): ItemWithOwner => ({
    ...i,
    owner_first_name: profile.first_name,
    owner_suburb: profile.suburb,
    owner_photo_url: profile.photo_url,
    owner_reputation: profile.reputation_score
  });

  return (
    <main className="max-w-2xl mx-auto pb-8">
      <PublicMasthead
        profile={profile}
        lent={lentCount ?? 0}
        borrowed={borrowedCount ?? 0}
        actions={
          !isMe && user && (
            <>
              <Link
                href={`/messages/${profile.id}`}
                className="font-display font-bold text-[13px] px-3 py-1.5 bg-ink text-paper"
              >
                Message
              </Link>
              <SafetyMenu
                targetKind="profile"
                targetId={profile.id}
                blockableUserId={profile.id}
                alreadyBlocked={isBlocked}
                context="this user"
              />
            </>
          )
        }
      />

      <section className="px-5 mt-8">
        <div className="flex items-baseline justify-between pb-2 mb-4 border-b-[1.5px] border-ink">
          <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-ink">
            {isMe ? <>Your <Italic>shelf</Italic></> : <><span className="capitalize">{profile.first_name}&apos;s</span> <Italic>shelf</Italic></>}
          </h2>
          <Mono className="text-ink-soft">
            {items.length === 0 ? 'EMPTY' : `${items.length} ${items.length === 1 ? 'THING' : 'THINGS'}`}
          </Mono>
        </div>
        {items.length === 0 ? (
          <p className="font-italic italic text-ink-soft text-sm py-3">No listings yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map(it => <ItemCard key={it.id} item={wrap(it)} />)}
          </div>
        )}
      </section>

      <section className="px-5 mt-9">
        <div className="flex items-baseline justify-between pb-2 mb-4 border-b-[1.5px] border-ink">
          <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-ink">
            What <Italic>they say</Italic>
          </h2>
          <Mono className="text-ink-soft">
            {reviews.length === 0 ? 'NONE YET' : `${reviews.length} ${reviews.length === 1 ? 'REVIEW' : 'REVIEWS'}`}
          </Mono>
        </div>
        {reviews.length === 0 ? (
          <p className="font-italic italic text-ink-soft text-sm py-3">No reviews yet.</p>
        ) : (
          <div className="flex flex-col">
            {reviews.map(r => (
              <div key={r.id} className="py-4 border-b border-dashed border-ink/30">
                {r.comment && (
                  <p className="font-italic italic text-[18px] leading-[1.3] text-ink">
                    &ldquo;{r.comment}&rdquo;
                  </p>
                )}
                <Mono className="text-ink-soft mt-2 block">
                  · {r.stars} ★ · {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }).toUpperCase()}
                </Mono>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function PublicMasthead({
  profile, lent, borrowed, actions
}: {
  profile: Profile;
  lent: number;
  borrowed: number;
  actions?: React.ReactNode;
}) {
  const userTerritory = territoryForUser(profile.id);
  const palette = paletteForCategory(userTerritory);
  const sinceMonth = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }).toUpperCase().replace(/\s+/g, ' ')
    : '—';
  const rating = Number(profile.reputation_score ?? 0).toFixed(1);

  return (
    <header
      className="px-5 pt-12 pb-7"
      style={{ background: palette.bg, color: palette.ink, ...grainStyle }}
    >
      <div className="flex justify-between items-center">
        <Wordmark size={20} />
        <Mono style={{ color: palette.ink, opacity: 0.85 }}>SINCE {sinceMonth}</Mono>
      </div>

      <Link href="/home" className="mt-5 inline-block hover:opacity-70 transition" style={{ color: palette.ink }}>
        <Mono style={{ color: palette.ink }}>← Back</Mono>
      </Link>

      <div className="mt-6 flex items-end gap-4">
        <div className="shrink-0">
          <Avatar url={profile.photo_url} name={profile.first_name} size={92} />
        </div>
        <div className="min-w-0 flex-1">
          <h1
            className="font-display font-extrabold leading-[0.9] tracking-[-0.035em]"
            style={{ color: palette.ink, fontSize: 'clamp(40px, 13vw, 56px)' }}
          >
            {profile.first_name}<Italic>.</Italic>
          </h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <Mono style={{ color: palette.ink, opacity: 0.85 }}>· {profile.suburb?.toUpperCase()}</Mono>
            {profile.phone_verified && <VerifiedBadge size={14} />}
            <AwayBadge awayUntil={profile.away_until} />
          </div>
        </div>
      </div>

      {actions && (
        <div className="mt-5 flex items-center gap-2">
          {actions}
        </div>
      )}

      <div
        className="mt-6 grid grid-cols-4"
        style={{ borderTop: `1px solid ${palette.ink}` }}
      >
        <Stat label="Karma" value={profile.karma_points ?? 0} palette={palette} />
        <Stat label="Rating" value={rating} palette={palette} divider />
        <Stat label="Lent" value={`${lent}×`} palette={palette} divider />
        <Stat label="Borrowed" value={`${borrowed}×`} palette={palette} divider />
      </div>
    </header>
  );
}

function Stat({
  label, value, palette, divider
}: {
  label: string;
  value: React.ReactNode;
  palette: { ink: string };
  divider?: boolean;
}) {
  return (
    <div
      className="px-2 py-3 text-center"
      style={{ borderLeft: divider ? `1px solid ${palette.ink}` : undefined }}
    >
      <Mono style={{ color: palette.ink, opacity: 0.7 }}>{label}</Mono>
      <div
        className="font-display font-extrabold mt-1"
        style={{ color: palette.ink, fontSize: 18 }}
      >
        {value}
      </div>
    </div>
  );
}

