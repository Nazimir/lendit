import { createClient } from '@/lib/supabase/server';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';
import { Avatar } from '@/components/Avatar';
import { ProfileEditor } from './ProfileEditor';
import { SignOut } from './SignOut';
import { AvatarUploader } from './AvatarUploader';
import { DeleteAccount } from './DeleteAccount';
import { AwayModeToggle } from './AwayModeToggle';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { REQUIRE_PHONE_VERIFICATION } from '@/lib/featureFlags';
import { paletteForCategory } from '@/lib/categoryStyle';
import { grainStyle } from '@/lib/grain';
import { territoryForProfile } from '@/lib/personalTerritory';
import { ShuffleColourButton } from './ShuffleColourButton';
import Link from 'next/link';
import type { Profile, Review } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: me }, { data: reviewsRaw }, { count: lentCount }, { count: borrowedCount }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('reviews').select('*').eq('reviewee_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('loans').select('id', { count: 'exact', head: true }).eq('lender_id', user.id).eq('status', 'completed'),
    supabase.from('loans').select('id', { count: 'exact', head: true }).eq('borrower_id', user.id).eq('status', 'completed')
  ]);

  const profile = me as Profile;
  const reviews = (reviewsRaw || []) as Review[];

  return (
    <main className="max-w-2xl mx-auto pb-8">
      <ProfileMasthead
        profile={profile}
        own
        lent={lentCount ?? 0}
        borrowed={borrowedCount ?? 0}
        reviewsCount={reviews.length}
        signOut={<SignOut />}
      />

      <section className="px-5 pt-6">
        <AvatarUploader profile={profile} size={64} />
        <Mono className="text-ink-soft mt-2 block">Tap your avatar to change your photo</Mono>

        {REQUIRE_PHONE_VERIFICATION && !profile?.phone_verified && (
          <Link
            href="/verify?next=/profile"
            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 font-mono text-[10px] uppercase tracking-mono bg-cat-kitchen text-ink"
          >
            · Verify your phone
          </Link>
        )}
      </section>

      <section className="px-5 mt-7">
        <ProfileEditor profile={profile} />
      </section>

      <section className="px-5 mt-3">
        <AwayModeToggle profile={profile} />
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
          <p className="font-italic italic text-ink-soft text-sm py-3">No reviews yet. The first ones come after your first completed loan.</p>
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
                  · {r.stars} ★ · {timeAgoShort(r.created_at)}
                </Mono>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="px-5 mt-9 text-center">
        <DeleteAccount />
      </section>
    </main>
  );
}

function ProfileMasthead({
  profile, own, lent, borrowed, reviewsCount, signOut, actionSlot
}: {
  profile: Profile;
  own: boolean;
  lent: number;
  borrowed: number;
  reviewsCount: number;
  signOut?: React.ReactNode;
  actionSlot?: React.ReactNode;
}) {
  // Personal territory — honours the user's override if they've shuffled,
  // falls back to the hash-derived default otherwise.
  const userTerritory = territoryForProfile(profile);
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
        <div className="flex items-center gap-3">
          {own && <ShuffleColourButton color={palette.ink} />}
          <Mono style={{ color: palette.ink, opacity: 0.85 }}>SINCE {sinceMonth}</Mono>
        </div>
      </div>
      <div className="mt-5 flex justify-between items-center">
        <Mono style={{ color: palette.ink, opacity: 0.85 }}>
          {own ? 'You' : 'Neighbour'} · /u/{profile.id.slice(0, 6)}
        </Mono>
        {(signOut || actionSlot) && (
          <div className="flex items-center gap-2">
            {actionSlot}
            {signOut}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-end gap-4">
        <div className="shrink-0">
          <Avatar url={profile.photo_url} name={profile.first_name} size={92} />
        </div>
        <div className="min-w-0">
          <h1
            className="font-display font-extrabold leading-[0.9] tracking-[-0.035em]"
            style={{ color: palette.ink, fontSize: 'clamp(40px, 13vw, 56px)' }}
          >
            {profile.first_name}<span style={{ color: palette.ink }}><Italic>.</Italic></span>
          </h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <Mono style={{ color: palette.ink, opacity: 0.85 }}>· {profile.suburb?.toUpperCase()}</Mono>
            {profile.phone_verified && <VerifiedBadge size={14} />}
          </div>
        </div>
      </div>

      {/* Stats strip — inline at bottom of masthead */}
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

function timeAgoShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }).toUpperCase();
}
