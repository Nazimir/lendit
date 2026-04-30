import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { Stars } from '@/components/Stars';
import type { Profile, Review } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: prof } = await supabase.from('profiles').select('*').eq('id', params.id).single();
  if (!prof) notFound();
  const { data: reviewsRaw } = await supabase
    .from('reviews').select('*').eq('reviewee_id', params.id)
    .order('created_at', { ascending: false }).limit(20);
  const reviews = (reviewsRaw || []) as Review[];
  const profile = prof as Profile;

  return (
    <main>
      <PageHeader title={profile.first_name} back="/home" />
      <div className="px-4 max-w-2xl mx-auto pb-8">
        <div className="card p-5 flex items-center gap-4">
          <Avatar url={profile.photo_url} name={profile.first_name} size={72} />
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold">{profile.first_name}</div>
            <div className="text-sm text-gray-500">{profile.suburb}</div>
            <div className="flex items-center gap-2 mt-1">
              <Stars value={profile.reputation_score} />
              <span className="text-xs text-gray-600">
                {profile.reputation_score.toFixed(1)} · {profile.karma_points} karma
              </span>
            </div>
          </div>
        </div>

        <h2 className="text-sm font-semibold text-gray-700 mt-7 mb-3 uppercase tracking-wide">Reviews</h2>
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
