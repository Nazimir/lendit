import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { Stars } from '@/components/Stars';
import { ProfileEditor } from './ProfileEditor';
import { SignOut } from './SignOut';
import { AvatarUploader } from './AvatarUploader';
import type { Profile, Review } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const { data: reviewsRaw } = await supabase
    .from('reviews').select('*').eq('reviewee_id', user.id).order('created_at', { ascending: false }).limit(20);

  const profile = me as Profile;
  const reviews = (reviewsRaw || []) as Review[];

  return (
    <main>
      <PageHeader title="Profile" action={<SignOut />} />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        <div className="card p-5 flex items-center gap-4">
          <AvatarUploader profile={profile} size={64} />
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold">{profile?.first_name}</div>
            <div className="text-sm text-gray-500">{profile?.suburb}</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Stars value={Number(profile?.reputation_score ?? 0)} />
              <span className="text-xs text-gray-600">
                {Number(profile?.reputation_score ?? 0).toFixed(1)}
                {' '}
                ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                {' · '}
                {profile?.karma_points ?? 0} karma
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <ProfileEditor profile={profile} />
        </div>

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
