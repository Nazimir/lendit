import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ItemCard } from '@/components/ItemCard';
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

  // My items currently out (loans where I'm lender, status not completed)
  const { data: outLoansRaw } = await supabase
    .from('loans')
    .select('*')
    .eq('lender_id', user.id)
    .in('status', ['pending_handover', 'active', 'pending_return']);
  const outLoans = (outLoansRaw || []) as Loan[];

  // Fetch their items in one query
  let outItems: Item[] = [];
  if (outLoans.length > 0) {
    const ids = outLoans.map(l => l.item_id);
    const { data: its } = await supabase.from('items').select('*').in('id', ids);
    outItems = (its || []) as Item[];
  }

  return (
    <main className="px-4 max-w-2xl mx-auto pt-[env(safe-area-inset-top)]">
      <div className="pt-6 pb-3">
        <h1 className="font-display text-4xl tracking-tight leading-none">
          Hi <span className="font-script text-accent-600">{me?.first_name?.split(' ')[0] || 'there'}</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">What do you need to borrow today?</p>
      </div>

      <SearchBar defaultValue={q} />

      {outLoans.length > 0 && (
        <section className="mt-7">
          <h2 className="font-mono text-[10px] font-semibold text-gray-700 mb-3 uppercase tracking-wider">Your items currently out</h2>
          <div className="space-y-2">
            {outLoans.map(l => {
              const item = outItems.find(i => i.id === l.item_id);
              if (!item) return null;
              const palette = paletteForCategory(item.category);
              return (
                <Link
                  key={l.id}
                  href={`/loans/${l.id}`}
                  className="rounded-3xl p-3 flex items-center gap-3 border-2 shadow-soft hover:-translate-y-0.5 transition block"
                  style={{ background: palette.bg, borderColor: palette.accent, color: palette.ink }}
                >
                  <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border" style={{ borderColor: palette.accent }}>
                    {item.photos?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg leading-tight line-clamp-1">{item.title}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider mt-0.5 opacity-70">
                      {l.status === 'pending_handover' && 'Awaiting handover'}
                      {l.status === 'active' && (l.due_at ? `Due ${new Date(l.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'On loan')}
                      {l.status === 'pending_return' && 'Return in progress'}
                    </div>
                  </div>
                  <span
                    className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full shrink-0"
                    style={{ background: palette.accent, color: '#fff' }}
                  >
                    {l.status.replace('_', ' ')}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-7">
        <h2 className="font-mono text-[10px] font-semibold text-gray-700 mb-3 uppercase tracking-wider">
          {q ? `Results for "${q}"` : me?.suburb ? `Available near ${me.suburb}` : 'Available now'}
        </h2>
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm py-6 text-center">
            Nothing here yet. Try a different search, or list your own item to kick things off.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map(it => <ItemCard key={it.id} item={it} />)}
          </div>
        )}
      </section>
    </main>
  );
}
