import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { paletteForCategory } from '@/lib/categoryStyle';
import { ClaimForm } from './ClaimForm';
import type { LendInvite, Item, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }: { params: { token: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: invite } = await supabase
    .from('lend_invites')
    .select('*')
    .eq('token', params.token)
    .maybeSingle();

  if (!invite) notFound();

  const inv = invite as LendInvite;
  const expired = new Date(inv.expires_at).getTime() < Date.now();

  const [{ data: item }, { data: lender }] = await Promise.all([
    supabase.from('items').select('*').eq('id', inv.item_id).single(),
    supabase.from('profiles').select('*').eq('id', inv.lender_id).single()
  ]);
  if (!item || !lender) notFound();

  const palette = paletteForCategory((item as Item).category);

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <div className="mb-6 text-center">
        <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
          Partaz · in-person loan
        </div>
        <h1 className="font-display text-3xl mt-1">
          {(lender as Profile).first_name} wants to lend you something
        </h1>
        {inv.recipient_hint && (
          <p className="font-script text-2xl text-accent-600 mt-1">for {inv.recipient_hint}</p>
        )}
      </div>

      <article
        className="rounded-3xl overflow-hidden border-2 shadow-soft"
        style={{ background: palette.bg, borderColor: palette.accent, color: palette.ink }}
      >
        {(item as Item).photos[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(item as Item).photos[0]} alt={(item as Item).title} className="w-full aspect-[4/3] object-cover" />
        )}
        <div className="p-5">
          <h2 className="font-display text-3xl leading-tight">{(item as Item).title}</h2>
          <p className="mt-2 whitespace-pre-wrap">{(item as Item).description}</p>
          <div className="font-mono text-[10px] uppercase tracking-wider mt-3 opacity-70">
            {inv.loan_period_days}-day loan · From {(lender as Profile).first_name} in {(lender as Profile).suburb}
          </div>
        </div>
      </article>

      <div className="mt-6">
        {inv.status !== 'pending' ? (
          <div className="card p-6 text-center">
            <p className="font-display text-2xl">This invite has already been used.</p>
            <p className="text-sm text-gray-500 mt-2">Ask {(lender as Profile).first_name} for a new one.</p>
          </div>
        ) : expired ? (
          <div className="card p-6 text-center">
            <p className="font-display text-2xl">This invite has expired.</p>
            <p className="text-sm text-gray-500 mt-2">Ask {(lender as Profile).first_name} for a fresh link.</p>
          </div>
        ) : (
          <ClaimForm
            token={inv.token}
            isSignedIn={!!user}
            recipientHint={inv.recipient_hint}
            lenderName={(lender as Profile).first_name}
          />
        )}
      </div>
    </main>
  );
}
