import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic } from '@/components/typography';
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

  const itemObj = item as Item;
  const lenderObj = lender as Profile;
  const palette = paletteForCategory(itemObj.category);

  return (
    <main className="min-h-screen bg-paper px-6 py-10 flex flex-col">
      <div className="w-full max-w-md mx-auto">
        {/* Masthead */}
        <div className="flex justify-between items-center mb-10">
          <Wordmark size={22} />
          <Mono className="text-ink-soft">In-person loan</Mono>
        </div>

        {/* Headline */}
        <div>
          <Mono className="text-ink-soft block mb-3">
            From {lenderObj.first_name} · {lenderObj.suburb}
          </Mono>
          <h1 className="font-display font-extrabold text-[48px] leading-[0.9] tracking-[-0.04em] text-ink text-balance">
            {lenderObj.first_name} wants to <Italic>lend</Italic> you something.
          </h1>
          {inv.recipient_hint && (
            <p className="font-italic italic text-[22px] leading-[1.3] text-ink-soft mt-3">
              for {inv.recipient_hint}
            </p>
          )}
        </div>

        {/* Item card — full bleed territory */}
        <article
          className="mt-10 rounded-3xl overflow-hidden"
          style={{ background: palette.bg, color: palette.ink }}
        >
          {itemObj.photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={itemObj.photos[0]}
              alt={itemObj.title}
              className="w-full aspect-[4/3] object-cover"
            />
          )}
          <div className="p-5">
            <Mono style={{ color: palette.ink, opacity: 0.7 }} className="block mb-2">
              {itemObj.category}
            </Mono>
            <h2 className="font-display font-extrabold text-[32px] leading-[0.95] tracking-[-0.03em]" style={{ color: palette.ink }}>
              {itemObj.title}
            </h2>
            {itemObj.description && (
              <p className="mt-3 leading-relaxed whitespace-pre-wrap" style={{ color: palette.ink }}>
                {itemObj.description}
              </p>
            )}
            <Mono style={{ color: palette.ink, opacity: 0.7 }} className="block mt-4">
              {inv.loan_period_days ? `${inv.loan_period_days}-day loan` : 'Open-ended loan'}
            </Mono>
          </div>
        </article>

        {/* Action zone */}
        <div className="mt-10">
          {inv.status !== 'pending' ? (
            <div className="border-y-[1.5px] border-ink py-6">
              <h2 className="font-display font-bold text-[24px] leading-tight tracking-[-0.02em] text-ink">
                Already <Italic>used</Italic>.
              </h2>
              <Mono className="text-ink-soft mt-2 block">
                Ask {lenderObj.first_name} for a fresh link.
              </Mono>
            </div>
          ) : expired ? (
            <div className="border-y-[1.5px] border-ink py-6">
              <h2 className="font-display font-bold text-[24px] leading-tight tracking-[-0.02em] text-ink">
                Link <Italic>expired</Italic>.
              </h2>
              <Mono className="text-ink-soft mt-2 block">
                Ask {lenderObj.first_name} for a new one.
              </Mono>
            </div>
          ) : (
            <ClaimForm
              token={inv.token}
              isSignedIn={!!user}
              recipientHint={inv.recipient_hint}
              lenderName={lenderObj.first_name}
            />
          )}
        </div>

        <div className="mt-10 text-center">
          <Mono className="text-ink-soft leading-relaxed">
            Partaz · Free neighbourhood lending
          </Mono>
          <Mono className="text-ink-soft block mt-1">
            <Link href="/about" className="hover:text-ink">About</Link> ·{' '}
            <Link href="/terms" className="hover:text-ink">Terms</Link>
          </Mono>
        </div>
      </div>
    </main>
  );
}
