import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ItemCard } from '@/components/ItemCard';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic, Rule } from '@/components/typography';
import { MonoBadge } from '@/components/MonoBadge';
import { SearchBar } from './SearchBar';
import { paletteForCategory } from '@/lib/categoryStyle';
import { expandSearchTerms } from '@/lib/synonyms';
import type { ItemWithOwner, Loan, Item } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const q = (searchParams.q || '').trim();

  // Search: when a query is present, use the fuzzy RPC (typo-tolerant +
  // synonym-expanded). Without a query, just list available items.
  let items: ItemWithOwner[] = [];
  if (q) {
    const terms = expandSearchTerms(q);
    const { data: searchResults } = await supabase.rpc('search_items_fuzzy', { terms });
    items = (searchResults || []) as ItemWithOwner[];
  } else {
    const { data: feed } = await supabase
      .from('items_with_owner')
      .select('*')
      .eq('is_available', true)
      .neq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60);
    items = (feed || []) as ItemWithOwner[];
  }

  // Sort: available + same suburb first, then on-loan + same suburb,
  // then everyone else. The RPC already orders by score; we re-stable-sort
  // by suburb on top of that.
  items.sort((a, b) => {
    const aAvail = a.is_available ? 0 : 1;
    const bAvail = b.is_available ? 0 : 1;
    if (aAvail !== bAvail) return aAvail - bAvail;
    const aLocal = me?.suburb && a.owner_suburb === me.suburb ? 0 : 1;
    const bLocal = me?.suburb && b.owner_suburb === me.suburb ? 0 : 1;
    return aLocal - bLocal;
  });

  // Split into mosaic: first item = hero, second = secondary, rest = tile grid.
  const hero      = items[0] ?? null;
  const secondary = items[1] ?? null;
  const tiles     = items.slice(2);

  // My items currently out (loans where I'm lender, status not completed)
  const { data: outLoansRaw } = await supabase
    .from('loans')
    .select('*')
    .eq('lender_id', user.id)
    .in('status', ['pending_handover', 'active', 'pending_return']);
  const outLoans = (outLoansRaw || []) as Loan[];

  let outItems: Item[] = [];
  if (outLoans.length > 0) {
    const ids = outLoans.map(l => l.item_id);
    const { data: its } = await supabase.from('items').select('*').in('id', ids);
    outItems = (its || []) as Item[];
  }

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  }).toUpperCase().replace(',', ' ·');

  const sectionLabel = q
    ? `Results for "${q}"`
    : me?.suburb
      ? `Available near ${me.suburb}`
      : 'Available now';

  return (
    <main className="max-w-2xl mx-auto pt-[env(safe-area-inset-top)]">
      {/* Header chrome — padded */}
      <div className="px-4">
        <div className="pt-5 pb-3 flex items-center justify-between">
          <Wordmark size={26} />
          <Mono className="text-ink-soft">{today}</Mono>
        </div>
        <Rule />

        <div className="pt-5 pb-4">
          <h1 className="font-display font-extrabold text-[44px] leading-[0.9] tracking-[-0.035em] text-ink">
            Hi <Italic>{me?.first_name?.split(' ')[0] || 'there'}</Italic>
          </h1>
          <Mono className="text-ink-soft mt-2.5 block">
            What do you need to borrow today?
          </Mono>
        </div>

        <SearchBar defaultValue={q} />

        {outLoans.length > 0 && (
          <section className="mt-7">
            <Mono className="block text-ink mb-3">Your items currently out</Mono>
            <ul className="space-y-px">
              {outLoans.map(l => {
                const item = outItems.find(i => i.id === l.item_id);
                if (!item) return null;
                const palette = paletteForCategory(item.category);
                const due = l.due_at
                  ? new Date(l.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  : null;
                return (
                  <li key={l.id}>
                    <Link
                      href={`/loans/${l.id}`}
                      className="flex items-center gap-3 p-3 border-t border-ink/15 hover:bg-paper-soft transition"
                    >
                      <div
                        className="w-14 h-14 shrink-0 overflow-hidden relative"
                        style={{ background: palette.bg }}
                      >
                        {item.photos?.[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.photos[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-bold text-[17px] leading-tight line-clamp-1 text-ink">
                          {item.title}
                        </div>
                        <Mono className="text-ink-soft block mt-1">
                          {l.status === 'pending_handover' && 'Awaiting handover'}
                          {l.status === 'active' && (due ? `Due ${due}` : 'On loan')}
                          {l.status === 'pending_return' && 'Return in progress'}
                        </Mono>
                      </div>
                      <MonoBadge variant={l.status === 'pending_return' ? 'kitchen' : 'ink'}>
                        {l.status.replace('_', ' ')}
                      </MonoBadge>
                    </Link>
                  </li>
                );
              })}
              <li className="border-t border-ink/15" aria-hidden />
            </ul>
          </section>
        )}
      </div>

      {/* Feed — edge to edge */}
      <section className="mt-7">
        <div className="px-4 mb-3">
          <Mono className="block text-ink">{sectionLabel}</Mono>
        </div>

        {items.length === 0 ? (
          <p className="px-4 text-ink-soft text-sm py-6 text-center font-italic italic">
            Nothing here yet. Try a different search, or list your own item to kick things off.
          </p>
        ) : (
          <>
            {hero && <ItemCard item={hero} variant="hero" />}

            {(secondary || tiles.length > 0) && (
              <div className="px-4 py-4 mt-0 border-t border-b border-ink flex justify-between items-baseline">
                <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-ink">
                  Also <Italic>around</Italic>
                </h2>
                <Mono className="text-ink-soft">
                  {tiles.length + (secondary ? 1 : 0)} more
                </Mono>
              </div>
            )}

            {secondary && <div className="pt-4"><ItemCard item={secondary} variant="secondary" /></div>}

            {tiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 px-4 mt-4">
                {tiles.map(it => <ItemCard key={it.id} item={it} variant="tile" />)}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
